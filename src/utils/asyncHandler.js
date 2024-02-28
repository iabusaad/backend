const asyncHandler = (asyncHandler) => {
  (req, res, next) => {
    Promise.resolve(asyncHandler(req, res, next)).catch((error) => next.error);
  };
};

export default asyncHandler;

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
