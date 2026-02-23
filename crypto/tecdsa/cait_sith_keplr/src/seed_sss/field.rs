use std::sync::LazyLock;

use num_bigint::BigUint;
use num_traits::{One, Zero};
use rand_core::CryptoRngCore;

/// p = 2^256 + 297 (verified prime, the smallest prime > 2^256)
///
/// Every 32-byte value v satisfies 0 <= v <= 2^256 - 1 < p,
/// so any 32-byte secret or evaluation point is a valid field element.
static PRIME: LazyLock<BigUint> = LazyLock::new(|| {
    BigUint::from(2u32).pow(256) + BigUint::from(297u32)
});

/// A field element in GF(p) where p = 2^256 + 297 > 2^256.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FieldElement {
    value: BigUint,
}

impl FieldElement {
    /// The prime modulus.
    pub fn modulus() -> &'static BigUint {
        &PRIME
    }

    /// Zero element.
    pub fn zero() -> Self {
        Self {
            value: BigUint::zero(),
        }
    }

    /// One element.
    pub fn one() -> Self {
        Self {
            value: BigUint::one(),
        }
    }

    /// Create a field element from a 32-byte big-endian array.
    /// Always succeeds because p > 2^256 and any 32-byte value < 2^256 < p.
    pub fn from_bytes(bytes: &[u8; 32]) -> Self {
        Self {
            value: BigUint::from_bytes_be(bytes),
        }
    }

    /// Convert back to a 32-byte big-endian array.
    /// Returns Err if the value >= 2^256.
    ///
    /// Since p = 2^256 + 297 and random polynomial coefficients are < 2^256,
    /// the probability of a share value y >= 2^256 is at most 297/p ≈ 2^{-248}.
    /// This is roughly 10^{-75}, far below any practical concern.
    pub fn to_bytes(&self) -> Result<[u8; 32], String> {
        let bytes = self.value.to_bytes_be();
        if bytes.len() > 32 {
            return Err(format!(
                "Field element exceeds 32 bytes (got {} bytes). \
                 This has probability ~2^{{-248}} and should never occur in practice.",
                bytes.len()
            ));
        }
        let mut result = [0u8; 32];
        result[32 - bytes.len()..].copy_from_slice(&bytes);
        Ok(result)
    }

    /// Generate a random field element suitable for polynomial coefficients.
    /// Uses 32 random bytes — all values in [0, 2^256 - 1] are valid and < p.
    pub fn random(rng: &mut impl CryptoRngCore) -> Self {
        let mut bytes = [0u8; 32];
        rng.fill_bytes(&mut bytes);
        Self::from_bytes(&bytes)
    }

    /// Addition mod p.
    pub fn add(&self, other: &Self) -> Self {
        Self {
            value: (&self.value + &other.value) % &*PRIME,
        }
    }

    /// Subtraction mod p.
    pub fn sub(&self, other: &Self) -> Self {
        let value = if self.value >= other.value {
            (&self.value - &other.value) % &*PRIME
        } else {
            (&*PRIME + &self.value - &other.value) % &*PRIME
        };
        Self { value }
    }

    /// Multiplication mod p.
    pub fn mul(&self, other: &Self) -> Self {
        Self {
            value: (&self.value * &other.value) % &*PRIME,
        }
    }

    /// Modular inverse via Fermat's little theorem: a^(p-2) mod p.
    /// Returns Err if the element is zero.
    pub fn inv(&self) -> Result<Self, String> {
        if self.value.is_zero() {
            return Err("Cannot invert zero".to_string());
        }
        let exp = &*PRIME - BigUint::from(2u32);
        Ok(Self {
            value: self.value.modpow(&exp, &PRIME),
        })
    }
}

/// Evaluate a polynomial at a given point using Horner's method.
///
/// coefficients[0] is the constant term (f(0) = secret).
/// f(x) = c[0] + c[1]*x + c[2]*x^2 + ...
pub fn poly_evaluate(coefficients: &[FieldElement], x: &FieldElement) -> FieldElement {
    let mut result = FieldElement::zero();
    for c in coefficients.iter().rev() {
        result = result.mul(x).add(c);
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_prime_is_greater_than_2_256() {
        let two_256 = BigUint::from(2u32).pow(256);
        assert!(*PRIME > two_256);
        // Verify exact value: p = 2^256 + 297
        assert_eq!(*PRIME, two_256 + BigUint::from(297u32));
    }

    #[test]
    fn test_prime_is_odd() {
        // All primes > 2 are odd
        assert_eq!(&*PRIME % BigUint::from(2u32), BigUint::one());
    }

    /// Miller-Rabin primality test to verify our prime constant.
    #[test]
    fn test_prime_is_actually_prime() {
        let p = &*PRIME;

        // Quick trial division for small primes
        let small_primes: Vec<u32> = vec![
            2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79,
            83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167,
            173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251,
        ];
        for sp in &small_primes {
            assert_ne!(
                p % BigUint::from(*sp),
                BigUint::zero(),
                "p is divisible by {}",
                sp
            );
        }

        // Deterministic Miller-Rabin with multiple bases
        // For a 257-bit number, testing with bases 2,3,5,7,11,13,17,19,23,29,31,37
        // provides strong probabilistic primality assurance.
        let p_minus_1 = p - BigUint::one();
        // Write p-1 = 2^r * d
        let mut d = p_minus_1.clone();
        let mut r: u32 = 0;
        while &d % BigUint::from(2u32) == BigUint::zero() {
            d /= BigUint::from(2u32);
            r += 1;
        }

        let witnesses: Vec<u32> = vec![2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37];
        for a in &witnesses {
            let a_big = BigUint::from(*a);
            let mut x = a_big.modpow(&d, p);

            if x == BigUint::one() || x == p_minus_1 {
                continue;
            }

            let mut found = false;
            for _ in 0..(r - 1) {
                x = x.modpow(&BigUint::from(2u32), p);
                if x == p_minus_1 {
                    found = true;
                    break;
                }
            }
            assert!(
                found,
                "Miller-Rabin failed for witness {}: p = 2^256 + 297 is NOT prime",
                a
            );
        }
    }

    #[test]
    fn test_any_32_byte_value_is_valid() {
        // max 32-byte value = 2^256 - 1 < p
        let max_bytes = [0xFFu8; 32];
        let fe = FieldElement::from_bytes(&max_bytes);
        let roundtrip = fe.to_bytes().unwrap();
        assert_eq!(max_bytes, roundtrip);
    }

    #[test]
    fn test_from_bytes_roundtrip_zero() {
        let bytes = [0u8; 32];
        let fe = FieldElement::from_bytes(&bytes);
        assert_eq!(fe, FieldElement::zero());
        assert_eq!(fe.to_bytes().unwrap(), bytes);
    }

    #[test]
    fn test_from_bytes_roundtrip_one() {
        let mut bytes = [0u8; 32];
        bytes[31] = 1;
        let fe = FieldElement::from_bytes(&bytes);
        assert_eq!(fe, FieldElement::one());
        assert_eq!(fe.to_bytes().unwrap(), bytes);
    }

    #[test]
    fn test_field_arithmetic_basic() {
        let a = FieldElement::from_bytes(&{
            let mut b = [0u8; 32];
            b[31] = 5;
            b
        });
        let b = FieldElement::from_bytes(&{
            let mut b = [0u8; 32];
            b[31] = 3;
            b
        });

        // add: 5 + 3 = 8
        let c = a.add(&b);
        assert_eq!(c.to_bytes().unwrap()[31], 8);

        // sub: 5 - 3 = 2
        let d = a.sub(&b);
        assert_eq!(d.to_bytes().unwrap()[31], 2);

        // mul: 5 * 3 = 15
        let e = a.mul(&b);
        assert_eq!(e.to_bytes().unwrap()[31], 15);

        // inv: 5 * inv(5) == 1
        let inv_a = a.inv().unwrap();
        let one = a.mul(&inv_a);
        assert_eq!(one, FieldElement::one());
    }

    #[test]
    fn test_inverse_various_values() {
        // Test inverse for several values
        for val in [1u8, 2, 3, 7, 42, 127, 255] {
            let mut bytes = [0u8; 32];
            bytes[31] = val;
            let fe = FieldElement::from_bytes(&bytes);
            let inv = fe.inv().unwrap();
            let product = fe.mul(&inv);
            assert_eq!(
                product,
                FieldElement::one(),
                "inv({}) * {} != 1",
                val,
                val
            );
        }
    }

    #[test]
    fn test_inverse_large_value() {
        // Test inverse for [0xFF; 32] = 2^256 - 1
        let bytes = [0xFFu8; 32];
        let fe = FieldElement::from_bytes(&bytes);
        let inv = fe.inv().unwrap();
        let product = fe.mul(&inv);
        assert_eq!(product, FieldElement::one());
    }

    #[test]
    fn test_sub_underflow() {
        let a = FieldElement::from_bytes(&{
            let mut b = [0u8; 32];
            b[31] = 1;
            b
        });
        let b = FieldElement::from_bytes(&{
            let mut b = [0u8; 32];
            b[31] = 3;
            b
        });
        // 1 - 3 mod p = p - 2
        let c = a.sub(&b);
        assert_eq!(c.value, &*PRIME - BigUint::from(2u32));

        // Verify: (p - 2) + 3 = p + 1 ≡ 1 mod p
        let restored = c.add(&b);
        assert_eq!(restored, a);
    }

    #[test]
    fn test_add_commutative() {
        let a = FieldElement::from_bytes(&[0xABu8; 32]);
        let b = FieldElement::from_bytes(&[0xCDu8; 32]);
        assert_eq!(a.add(&b), b.add(&a));
    }

    #[test]
    fn test_mul_commutative() {
        let a = FieldElement::from_bytes(&[0xABu8; 32]);
        let b = FieldElement::from_bytes(&[0xCDu8; 32]);
        assert_eq!(a.mul(&b), b.mul(&a));
    }

    #[test]
    fn test_distributive() {
        // a * (b + c) == a*b + a*c
        let a = FieldElement::from_bytes(&[0x12u8; 32]);
        let b = FieldElement::from_bytes(&[0x34u8; 32]);
        let c = FieldElement::from_bytes(&[0x56u8; 32]);

        let lhs = a.mul(&b.add(&c));
        let rhs = a.mul(&b).add(&a.mul(&c));
        assert_eq!(lhs, rhs);
    }

    #[test]
    fn test_poly_evaluate_linear() {
        // f(x) = 10 + 3x, f(2) = 16
        let coeffs = vec![
            FieldElement::from_bytes(&{
                let mut b = [0u8; 32];
                b[31] = 10;
                b
            }),
            FieldElement::from_bytes(&{
                let mut b = [0u8; 32];
                b[31] = 3;
                b
            }),
        ];
        let x = FieldElement::from_bytes(&{
            let mut b = [0u8; 32];
            b[31] = 2;
            b
        });
        let result = poly_evaluate(&coeffs, &x);
        assert_eq!(result.to_bytes().unwrap()[31], 16);
    }

    #[test]
    fn test_poly_evaluate_quadratic() {
        // f(x) = 1 + 2x + 3x^2, f(2) = 1 + 4 + 12 = 17
        let coeffs = vec![
            FieldElement::from_bytes(&{
                let mut b = [0u8; 32];
                b[31] = 1;
                b
            }),
            FieldElement::from_bytes(&{
                let mut b = [0u8; 32];
                b[31] = 2;
                b
            }),
            FieldElement::from_bytes(&{
                let mut b = [0u8; 32];
                b[31] = 3;
                b
            }),
        ];
        let x = FieldElement::from_bytes(&{
            let mut b = [0u8; 32];
            b[31] = 2;
            b
        });
        let result = poly_evaluate(&coeffs, &x);
        assert_eq!(result.to_bytes().unwrap()[31], 17);
    }

    #[test]
    fn test_poly_evaluate_at_zero() {
        // f(0) should always return the constant term
        let coeffs = vec![
            FieldElement::from_bytes(&{
                let mut b = [0u8; 32];
                b[31] = 42;
                b
            }),
            FieldElement::from_bytes(&[0xFFu8; 32]),
            FieldElement::from_bytes(&[0xAAu8; 32]),
        ];
        let result = poly_evaluate(&coeffs, &FieldElement::zero());
        assert_eq!(result.to_bytes().unwrap()[31], 42);
    }

    #[test]
    fn test_inv_zero_fails() {
        let zero = FieldElement::zero();
        assert!(zero.inv().is_err());
    }
}
