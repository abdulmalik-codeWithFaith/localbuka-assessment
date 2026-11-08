/** Standard success envelope used by every endpoint: { success: true, data }. */
export interface ApiSuccessResponse<T> {
  success: true;
  message?: string;
  data: T;
}
