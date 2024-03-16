const asyncHandler = (asyncHandler) => {
  return (req, res, next) => {
    Promise.resolve(asyncHandler(req, res, next)).catch((error) => next.error);
  };
};

export  {asyncHandler};

// const asynchandler = (fun) => async (req, res, next) => {
//   try {
//     await fun();
//   } catch (error) {
//     res.status(error.code || 500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };





//this is higher order function