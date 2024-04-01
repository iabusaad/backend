import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import Jwt from "jsonwebtoken";
import { response } from "express";
import mongoose from "mongoose";

const genrateAccceAndefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accesstoken = User.generateAccessToken();
    const refreshToken = User.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accesstoken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while grnrating refresh and acrss token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // check for images, check for avatar
  // upload them to cloudinary, avatar
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  // get user details from frontend
  const { fullName, email, userName, password } = req.body;
  // console.log("email:", email);
  // validation - not empty
  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all field is required");
  }

  // check if user already exists: username, email
  const ExistedUser = await User.findOne({
    $or: [{ email }, { userName }],
  });
  if (ExistedUser) {
    throw new ApiError(409, "User and email already exist");
  }
  // check for images, check for avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;
  // const coverImageLocalParh = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "avatar file is required");
  }

  // upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!avatar) {
    throw new ApiError(400, "avatar file is required");
  }

  // create user object - create entry in db
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });

  // remove password and refresh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // check for user creation
  if (!createdUser) {
    throw new ApiError(409, "Something went towrong when register the User");
  }
  // return res
  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registerd Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  // req body -> data
  // username or email
  //find the user
  //password check
  //access and referesh token
  //send cookie
  const { email, userName, password } = req.body;
  console.log(email, password);
  if (!(userName || email)) {
    throw new ApiError(400, "username or password is required");
  }
  const user = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "user does not exist");
  }
  const isPasswordVaild = await user.isPasswordCorrect(password);
  if (!isPasswordVaild) {
    throw new ApiError(401, "password is incorrect");
  }
  const { accesstoken, refreshToken } = await genrateAccceAndefreshTokens(
    user._id
  );
  const loggedInUser = await User.findById(user._id).select(
    "-password",
    "-refreshToken"
  );
  console.log(loggedInUser);
  //send coockies
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .cookie("accesstoken", accesstoken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      200,
      {
        user: loggedInUser,
        accesstoken,
        refreshToken,
      },
      "user loggedin successfully"
    );
});

//for logout

const logoutUser = asyncHandler(async (req, res) => {
  //req body data
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accesstoken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "user logged out"));
});

const refereshAccessoken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }
  try {
    const decodedToken = Jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    //query from database
    const user = await User.findOne(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh Token is expiredor used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accesstoken, newRefreshToken } = await genrateAccceAndefreshTokens(
      user._id
    );
    res
      .status(200)
      .cookie("accesstoken", accesstoken, options)
      .cookie("newRefreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accesstoken,
            refreshToken: newRefreshToken,
          },
          "Access Token Refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Refresh Token");
  }
});

const changCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid Old Password");
  }
  //to set the new password
  user.password = newPassword;
  //save the new password and return it
  await user.save({ validateBeforeSave: true });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Chang sucessfully"));
});
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "Current User Fetched Successfully"); // user is logged in from auth middleware
});
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;
  if (!(fullName || email)) {
    throw new ApiError(400, "All fiels are required");
  }
  //find the user whoes fullname and email updated
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    // use mongodb operator to save it
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");
  // if (!user) {
  //   throw new ApiError(400, "");
  // }
  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account updated successfully"));
});
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file not found");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar Image Sucessfully Updated"));
});
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverImageLocalPath = req.file?.path;
  if (!coverImageLocalPath) {
    throw new ApiError(400, "cover Image file not found");
  }
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading coverImage");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "coverImage Updated successfully"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, "Username is Missing");
  }
  const channels = User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: subscriptions,
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: subscriptions,
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        userName: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);
  if (!channels?.length) {
    throw new ApiError(404, "Channel not found");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, channels[0], "User Chanell fetched is successfully")
    );
});
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = awaitUser.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        locationbar: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    userName: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "watchHistory fetched is successfully"
      )
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refereshAccessoken,
  changCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory,
};
