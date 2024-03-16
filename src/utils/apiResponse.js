class ApiResponse {
  constuctor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.secess = statusCode < 400;
  }
}
export { ApiResponse };
