// export function setUserAuthRoutes(router: Router) {
//   router.post(
//     "/customer/auth/send-code",
//     rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
//     sendVerificationCodeRoute,
//   );
//
//   router.post(
//     "/customer/auth/verify-login",
//     rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
//     verifyEmailAndLogin,
//   );
//
//   router.post(
//     "/customer/auth/signin",
//     rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
//     signInCustomer,
//   );
//
//   router.post(
//     "/customer/auth/change-password",
//     rateLimitMiddleware({ windowSeconds: 60, maxRequests: 10 }),
//     customerJwtMiddleware,
//     changeCustomerPassword,
//   );
// }
