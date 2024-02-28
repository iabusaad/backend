class ApiResponse {
  constuctor(statusCode, data, message = "Success") {
    super(message);
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.secess = statusCode < 400;
  }
}
