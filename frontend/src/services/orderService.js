import cartService from './cartService';

export const orderService = {
  createOrder: cartService.createOrder,
  getUserOrders: cartService.getUserOrders,
  getOrderDetail: cartService.getOrderDetail,
  getOrderTracking: cartService.getOrderTracking,
  updateOrderStatus: cartService.updateOrderStatus,
  cancelOrder: cartService.cancelOrder,
  initiatePayment: cartService.initiatePayment,
  verifyPayment: cartService.verifyPayment,
  simulateWebhook: cartService.simulateWebhook,
};

export default orderService;
