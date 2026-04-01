export class ResponseDto<T> {
  success: boolean;
  message: string;
  data: T | null;

  constructor(data: T | null, message: string, success = true) {
    this.success = success;
    this.message = message;
    this.data = data;
  }

  static ok<T>(data: T | null, message = 'Success'): ResponseDto<T> {
    return new ResponseDto(data, message);
  }

  static fail<T>(message: string, data: T | null = null): ResponseDto<T> {
    return new ResponseDto(data, message, false);
  }
}
