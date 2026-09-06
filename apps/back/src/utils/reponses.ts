export abstract class RouteResponse {
  static success(message: string, data?: any) {
    return {success: true, message, data}
  }

  static error(message: string, data: any) {
    return {success: false, message, data}
  }
}
