// export function setUserRoutes(router: Router) {
//   router.post("/customer/info", customerJwtMiddleware, getCustomerInfo);
//
//   router.post("/customer/api_keys", customerJwtMiddleware, getCustomerApiKeys);
//
//   router.post(
//     "/customer/update_info",
//     rateLimitMiddleware({ windowSeconds: 10 * 60, maxRequests: 20 }),
//     customerJwtMiddleware,
//     multerMiddleware,
//     updateCustomerInfoRoute,
//   );
// }
