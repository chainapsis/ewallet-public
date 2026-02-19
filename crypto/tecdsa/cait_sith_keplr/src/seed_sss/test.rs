use rand_core::OsRng;
use rand_core::RngCore;

use crate::sss::Point256;

use super::ops::{seed_combine, seed_expand_shares, seed_split};

fn random_bytes(rng: &mut impl RngCore) -> [u8; 32] {
    let mut bytes = [0u8; 32];
    rng.fill_bytes(&mut bytes);
    bytes
}

// ─── Basic split/combine ─────────────────────────────────────────────

#[test]
fn test_split_and_combine_n3_t3() {
    let mut rng = OsRng;
    let secret = random_bytes(&mut rng);

    let hashes = vec![
        random_bytes(&mut rng),
        random_bytes(&mut rng),
        random_bytes(&mut rng),
    ];

    let shares = seed_split(secret, hashes, 3).unwrap();
    assert_eq!(shares.len(), 3);

    let recovered = seed_combine(shares, 3).unwrap();
    assert_eq!(secret, recovered);
}

#[test]
fn test_split_and_combine_n3_t2() {
    let mut rng = OsRng;
    let secret = random_bytes(&mut rng);

    let hashes = vec![
        random_bytes(&mut rng),
        random_bytes(&mut rng),
        random_bytes(&mut rng),
    ];

    let shares = seed_split(secret, hashes, 2).unwrap();

    // Any 2 out of 3 should recover the secret
    let recovered_01 = seed_combine(vec![shares[0], shares[1]], 2).unwrap();
    assert_eq!(secret, recovered_01);

    let recovered_02 = seed_combine(vec![shares[0], shares[2]], 2).unwrap();
    assert_eq!(secret, recovered_02);

    let recovered_12 = seed_combine(vec![shares[1], shares[2]], 2).unwrap();
    assert_eq!(secret, recovered_12);
}

// ─── Boundary values (CRITICAL: these would FAIL with secp256k1 SSS) ─

/// secp256k1 group order n
fn secp256k1_order() -> [u8; 32] {
    [
        0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
        0xFF, 0xFE, 0xBA, 0xAE, 0xDC, 0xE6, 0xAF, 0x48, 0xA0, 0x3B, 0xBF, 0xD2, 0x5E, 0x8C,
        0xD0, 0x36, 0x41, 0x41,
    ]
}

#[test]
fn test_secret_all_zeros() {
    let secret = [0u8; 32];
    let mut rng = OsRng;
    let hashes = vec![random_bytes(&mut rng), random_bytes(&mut rng)];

    let shares = seed_split(secret, hashes, 2).unwrap();
    let recovered = seed_combine(shares, 2).unwrap();
    assert_eq!(secret, recovered);
}

#[test]
fn test_secret_all_ff() {
    // 0xFF..FF = 2^256 - 1, which is ABOVE secp256k1 order.
    // This secret would be INVALID in secp256k1 SSS but MUST work in our 257-bit field.
    let secret = [0xFFu8; 32];
    let mut rng = OsRng;
    let hashes = vec![random_bytes(&mut rng), random_bytes(&mut rng)];

    let shares = seed_split(secret, hashes, 2).unwrap();
    let recovered = seed_combine(shares, 2).unwrap();
    assert_eq!(secret, recovered);
}

#[test]
fn test_secret_is_secp256k1_order() {
    // Exactly the secp256k1 group order — would be treated as 0 in secp256k1 SSS.
    let secret = secp256k1_order();
    let mut rng = OsRng;
    let hashes = vec![random_bytes(&mut rng), random_bytes(&mut rng)];

    let shares = seed_split(secret, hashes, 2).unwrap();
    let recovered = seed_combine(shares, 2).unwrap();
    assert_eq!(secret, recovered);
}

#[test]
fn test_secret_is_secp256k1_order_plus_1() {
    let mut secret = secp256k1_order();
    // Add 1 (big-endian increment)
    let mut carry = 1u16;
    for byte in secret.iter_mut().rev() {
        let sum = *byte as u16 + carry;
        *byte = sum as u8;
        carry = sum >> 8;
    }

    let mut rng = OsRng;
    let hashes = vec![random_bytes(&mut rng), random_bytes(&mut rng)];

    let shares = seed_split(secret, hashes, 2).unwrap();
    let recovered = seed_combine(shares, 2).unwrap();
    assert_eq!(secret, recovered);
}

#[test]
fn test_secret_is_secp256k1_order_minus_1() {
    let mut secret = secp256k1_order();
    // Subtract 1 (big-endian decrement)
    let mut borrow = 1i16;
    for byte in secret.iter_mut().rev() {
        let diff = *byte as i16 - borrow;
        if diff < 0 {
            *byte = (diff + 256) as u8;
            borrow = 1;
        } else {
            *byte = diff as u8;
            borrow = 0;
        }
    }

    let mut rng = OsRng;
    let hashes = vec![random_bytes(&mut rng), random_bytes(&mut rng)];

    let shares = seed_split(secret, hashes, 2).unwrap();
    let recovered = seed_combine(shares, 2).unwrap();
    assert_eq!(secret, recovered);
}

// ─── Security: t-1 shares must NOT recover the secret ────────────────

#[test]
fn test_t_minus_1_shares_cannot_recover_secret() {
    let mut rng = OsRng;
    let secret = random_bytes(&mut rng);

    let hashes = vec![
        random_bytes(&mut rng),
        random_bytes(&mut rng),
        random_bytes(&mut rng),
    ];
    let t = 3; // Need all 3 to recover

    let shares = seed_split(secret, hashes, t).unwrap();

    // Using only 2 of 3 shares (below threshold)
    // The combine function requires at least t shares, but even if we force it
    // with t=2 on 2 shares, the result should differ from the true secret
    // because the underlying polynomial has degree 2, not 1.
    let wrong_result = seed_combine(vec![shares[0], shares[1]], 2).unwrap();
    assert_ne!(
        secret, wrong_result,
        "t-1 shares should NOT recover the correct secret"
    );
}

#[test]
fn test_t_minus_1_shares_various_subsets() {
    let mut rng = OsRng;
    let secret = random_bytes(&mut rng);

    let hashes = vec![
        random_bytes(&mut rng),
        random_bytes(&mut rng),
        random_bytes(&mut rng),
        random_bytes(&mut rng),
    ];
    let t = 3; // Need 3 to recover

    let shares = seed_split(secret, hashes, t).unwrap();

    // No pair of 2 shares (out of 4) should recover the secret
    let pairs = vec![(0, 1), (0, 2), (0, 3), (1, 2), (1, 3), (2, 3)];
    for (i, j) in pairs {
        let wrong = seed_combine(vec![shares[i], shares[j]], 2).unwrap();
        assert_ne!(
            secret, wrong,
            "Shares ({}, {}) with t=2 should NOT recover secret (t=3 polynomial)",
            i, j
        );
    }

    // But any 3 shares should work
    let triples = vec![(0, 1, 2), (0, 1, 3), (0, 2, 3), (1, 2, 3)];
    for (i, j, k) in triples {
        let recovered = seed_combine(vec![shares[i], shares[j], shares[k]], 3).unwrap();
        assert_eq!(
            secret, recovered,
            "Shares ({}, {}, {}) with t=3 should recover secret",
            i, j, k
        );
    }
}

// ─── Realistic scenario: 2-of-2 server+user → t-of-n KSN expand ────

#[test]
fn test_realistic_keygen_flow() {
    let mut rng = OsRng;
    let seed = random_bytes(&mut rng);

    // Step 1: 2-of-2 split (server + user)
    let server_hash = random_bytes(&mut rng);
    let user_hash = random_bytes(&mut rng);
    let two_of_two = seed_split(seed, vec![server_hash, user_hash], 2).unwrap();
    let server_share = two_of_two[0];
    let user_share = two_of_two[1];

    // Verify 2-of-2 combine
    let recovered = seed_combine(vec![server_share, user_share], 2).unwrap();
    assert_eq!(seed, recovered);

    // Step 2: Split user's Y-value across KSN nodes (t-of-n)
    let user_y = user_share.y; // This is the user's secret to distribute
    let ksn_hashes: Vec<[u8; 32]> = (0..6).map(|_| random_bytes(&mut rng)).collect();
    let threshold = 4;

    let ksn_shares = seed_split(user_y, ksn_hashes.clone(), threshold).unwrap();
    assert_eq!(ksn_shares.len(), 6);

    // Verify any 4-of-6 can recover user_y
    let combos_4: Vec<Vec<usize>> = vec![
        vec![0, 1, 2, 3],
        vec![0, 1, 2, 4],
        vec![0, 2, 4, 5],
        vec![1, 3, 4, 5],
        vec![2, 3, 4, 5],
    ];
    for combo in &combos_4 {
        let subset: Vec<Point256> = combo.iter().map(|&i| ksn_shares[i]).collect();
        let recovered_y = seed_combine(subset, threshold).unwrap();
        assert_eq!(user_y, recovered_y, "4-of-6 combo {:?} failed", combo);
    }

    // Step 3: Reconstruct seed from server_share + recovered user_y
    let reconstructed_user_share = Point256 {
        x: user_share.x,
        y: seed_combine(ksn_shares[0..4].to_vec(), threshold).unwrap(),
    };
    let final_seed = seed_combine(vec![server_share, reconstructed_user_share], 2).unwrap();
    assert_eq!(seed, final_seed);
}

// ─── Expand shares ───────────────────────────────────────────────────

#[test]
fn test_expand_shares_basic() {
    let mut rng = OsRng;
    let secret = random_bytes(&mut rng);

    let initial_hashes = vec![
        random_bytes(&mut rng),
        random_bytes(&mut rng),
        random_bytes(&mut rng),
    ];
    let t = 2;

    let shares = seed_split(secret, initial_hashes.clone(), t).unwrap();

    let additional_hashes = vec![random_bytes(&mut rng), random_bytes(&mut rng)];
    let result = seed_expand_shares(shares.clone(), additional_hashes.clone(), t).unwrap();

    // 3 original + 2 new = 5
    assert_eq!(result.reshared_points.len(), 5);
    assert_eq!(result.secret, secret);

    // Original points preserved
    for i in 0..3 {
        assert_eq!(result.reshared_points[i], shares[i]);
    }

    // New points have correct x
    for (i, hash) in additional_hashes.iter().enumerate() {
        assert_eq!(result.reshared_points[3 + i].x, *hash);
    }

    // Any t points from the expanded set recover the secret
    let combos: Vec<(usize, usize)> = vec![(0, 1), (0, 3), (0, 4), (3, 4), (1, 4), (2, 3)];
    for (i, j) in combos {
        let recovered = seed_combine(
            vec![result.reshared_points[i], result.reshared_points[j]],
            t,
        )
        .unwrap();
        assert_eq!(
            secret, recovered,
            "Combo ({}, {}) failed after expand",
            i, j
        );
    }
}

#[test]
fn test_expand_shares_preserves_polynomial() {
    // After expanding, old and new shares must lie on the SAME polynomial
    let mut rng = OsRng;
    let secret = random_bytes(&mut rng);

    let initial_hashes = vec![
        random_bytes(&mut rng),
        random_bytes(&mut rng),
        random_bytes(&mut rng),
    ];
    let t = 2;
    let shares = seed_split(secret, initial_hashes, t).unwrap();

    let additional = vec![random_bytes(&mut rng)];
    let result = seed_expand_shares(shares.clone(), additional, t).unwrap();

    // old[0] + new[0] should recover the same secret as old[0] + old[1]
    let from_old_old = seed_combine(vec![shares[0], shares[1]], t).unwrap();
    let from_old_new = seed_combine(
        vec![result.reshared_points[0], result.reshared_points[3]],
        t,
    )
    .unwrap();
    assert_eq!(from_old_old, from_old_new);
    assert_eq!(secret, from_old_old);
}

#[test]
fn test_expand_multiple_rounds() {
    let mut rng = OsRng;
    let secret = random_bytes(&mut rng);

    let initial_hashes = vec![
        random_bytes(&mut rng),
        random_bytes(&mut rng),
        random_bytes(&mut rng),
    ];
    let t = 2;
    let shares = seed_split(secret, initial_hashes, t).unwrap();

    // Round 1: expand by 2
    let add1 = vec![random_bytes(&mut rng), random_bytes(&mut rng)];
    let result1 = seed_expand_shares(shares, add1, t).unwrap();
    assert_eq!(result1.reshared_points.len(), 5);
    assert_eq!(result1.secret, secret);

    // Round 2: expand by 1 more
    let add2 = vec![random_bytes(&mut rng)];
    let result2 = seed_expand_shares(result1.reshared_points, add2, t).unwrap();
    assert_eq!(result2.reshared_points.len(), 6);
    assert_eq!(result2.secret, secret);

    // Any 2 from the final 6 should recover the secret
    let recovered = seed_combine(
        vec![result2.reshared_points[0], result2.reshared_points[5]],
        t,
    )
    .unwrap();
    assert_eq!(secret, recovered);
}

// ─── Realistic expand scenario: reshare adds new KSN nodes ──────────

#[test]
fn test_realistic_reshare_scenario() {
    let mut rng = OsRng;
    let user_seed_y = random_bytes(&mut rng);

    // Initial: 4-of-6 KSN split
    let ksn_hashes: Vec<[u8; 32]> = (0..6).map(|_| random_bytes(&mut rng)).collect();
    let threshold = 4;
    let shares = seed_split(user_seed_y, ksn_hashes, threshold).unwrap();

    // Reshare: add 2 more KSN nodes (now 4-of-8)
    let new_ksn_hashes: Vec<[u8; 32]> = (0..2).map(|_| random_bytes(&mut rng)).collect();
    let expanded = seed_expand_shares(shares, new_ksn_hashes, threshold).unwrap();
    assert_eq!(expanded.reshared_points.len(), 8);
    assert_eq!(expanded.secret, user_seed_y);

    // Recover from mixed old+new nodes
    let subset: Vec<Point256> = vec![
        expanded.reshared_points[0], // old
        expanded.reshared_points[2], // old
        expanded.reshared_points[6], // new
        expanded.reshared_points[7], // new
    ];
    let recovered = seed_combine(subset, threshold).unwrap();
    assert_eq!(user_seed_y, recovered);
}

// ─── Large-scale: 4-of-6 (production-like) ──────────────────────────

#[test]
fn test_large_n6_t4() {
    let mut rng = OsRng;
    let secret = random_bytes(&mut rng);

    let hashes: Vec<[u8; 32]> = (0..6).map(|_| random_bytes(&mut rng)).collect();
    let t = 4;

    let shares = seed_split(secret, hashes, t).unwrap();
    assert_eq!(shares.len(), 6);

    // All C(6,4) = 15 combinations of 4-of-6 should recover the secret
    let indices: Vec<Vec<usize>> = vec![
        vec![0, 1, 2, 3],
        vec![0, 1, 2, 4],
        vec![0, 1, 2, 5],
        vec![0, 1, 3, 4],
        vec![0, 1, 3, 5],
        vec![0, 1, 4, 5],
        vec![0, 2, 3, 4],
        vec![0, 2, 3, 5],
        vec![0, 2, 4, 5],
        vec![0, 3, 4, 5],
        vec![1, 2, 3, 4],
        vec![1, 2, 3, 5],
        vec![1, 2, 4, 5],
        vec![1, 3, 4, 5],
        vec![2, 3, 4, 5],
    ];

    for combo in &indices {
        let subset: Vec<Point256> = combo.iter().map(|&i| shares[i]).collect();
        let recovered = seed_combine(subset, t).unwrap();
        assert_eq!(secret, recovered, "4-of-6 combo {:?} failed", combo);
    }
}

// ─── Large-scale: 9 nodes t=3, 10 nodes t=4 ─────────────────────────

/// Helper: generate all C(n,k) combinations of indices [0..n)
fn combinations(n: usize, k: usize) -> Vec<Vec<usize>> {
    let mut result = Vec::new();
    let mut combo = (0..k).collect::<Vec<_>>();
    loop {
        result.push(combo.clone());
        // Find rightmost element that can be incremented
        let mut i = k;
        loop {
            if i == 0 {
                return result;
            }
            i -= 1;
            if combo[i] < n - k + i {
                break;
            }
            if i == 0 {
                return result;
            }
        }
        combo[i] += 1;
        for j in (i + 1)..k {
            combo[j] = combo[j - 1] + 1;
        }
    }
}

#[test]
fn test_large_n9_t3_all_combinations() {
    // 9 nodes, threshold 3 → C(9,3) = 84 combinations
    let mut rng = OsRng;
    let secret = random_bytes(&mut rng);

    let hashes: Vec<[u8; 32]> = (0..9).map(|_| random_bytes(&mut rng)).collect();
    let t = 3;

    let shares = seed_split(secret, hashes, t).unwrap();
    assert_eq!(shares.len(), 9);

    let combos = combinations(9, 3);
    assert_eq!(combos.len(), 84); // C(9,3) = 84

    for combo in &combos {
        let subset: Vec<Point256> = combo.iter().map(|&i| shares[i]).collect();
        let recovered = seed_combine(subset, t).unwrap();
        assert_eq!(
            secret, recovered,
            "3-of-9 combo {:?} failed",
            combo
        );
    }
}

#[test]
fn test_large_n10_t4_all_combinations() {
    // 10 nodes, threshold 4 → C(10,4) = 210 combinations
    let mut rng = OsRng;
    let secret = random_bytes(&mut rng);

    let hashes: Vec<[u8; 32]> = (0..10).map(|_| random_bytes(&mut rng)).collect();
    let t = 4;

    let shares = seed_split(secret, hashes, t).unwrap();
    assert_eq!(shares.len(), 10);

    let combos = combinations(10, 4);
    assert_eq!(combos.len(), 210); // C(10,4) = 210

    for combo in &combos {
        let subset: Vec<Point256> = combo.iter().map(|&i| shares[i]).collect();
        let recovered = seed_combine(subset, t).unwrap();
        assert_eq!(
            secret, recovered,
            "4-of-10 combo {:?} failed",
            combo
        );
    }
}

// ─── Repeated random testing ─────────────────────────────────────────

#[test]
fn test_split_combine_100_random_secrets() {
    let mut rng = OsRng;
    for _ in 0..100 {
        let secret = random_bytes(&mut rng);
        let hashes = vec![random_bytes(&mut rng), random_bytes(&mut rng)];
        let shares = seed_split(secret, hashes, 2).unwrap();
        let recovered = seed_combine(shares, 2).unwrap();
        assert_eq!(secret, recovered);
    }
}

// ─── Error cases ─────────────────────────────────────────────────────

#[test]
fn test_error_insufficient_hashes() {
    assert!(seed_split([1u8; 32], vec![[2u8; 32]], 3).is_err());
}

#[test]
fn test_error_t_too_small() {
    assert!(seed_split([1u8; 32], vec![[2u8; 32], [3u8; 32]], 1).is_err());
}

#[test]
fn test_error_combine_insufficient() {
    let point = Point256 {
        x: [1u8; 32],
        y: [2u8; 32],
    };
    assert!(seed_combine(vec![point], 2).is_err());
}

#[test]
fn test_error_duplicate_x() {
    let p1 = Point256 {
        x: [1u8; 32],
        y: [2u8; 32],
    };
    let p2 = Point256 {
        x: [1u8; 32],
        y: [3u8; 32],
    };
    assert!(seed_combine(vec![p1, p2], 2).is_err());
}

#[test]
fn test_error_zero_x() {
    let p1 = Point256 {
        x: [0u8; 32],
        y: [2u8; 32],
    };
    let p2 = Point256 {
        x: [1u8; 32],
        y: [3u8; 32],
    };
    assert!(seed_combine(vec![p1, p2], 2).is_err());
}

#[test]
fn test_error_expand_overlap() {
    let mut rng = OsRng;
    let secret = random_bytes(&mut rng);
    let hash1 = random_bytes(&mut rng);
    let hash2 = random_bytes(&mut rng);

    let shares = seed_split(secret, vec![hash1, hash2], 2).unwrap();
    assert!(seed_expand_shares(shares, vec![hash1], 2).is_err());
}

// ─── Deterministic sanity check ──────────────────────────────────────

#[test]
fn test_known_polynomial_evaluation() {
    // Manual check: f(x) = 42 + cx (threshold=2, constant=42)
    // We split then combine, and the result must be exactly 42.
    let mut secret = [0u8; 32];
    secret[31] = 42;

    let mut h1 = [0u8; 32];
    h1[31] = 1;
    let mut h2 = [0u8; 32];
    h2[31] = 2;

    let shares = seed_split(secret, vec![h1, h2], 2).unwrap();

    // x-coordinates should match the hashes
    assert_eq!(shares[0].x, h1);
    assert_eq!(shares[1].x, h2);

    let recovered = seed_combine(shares, 2).unwrap();
    assert_eq!(secret, recovered);
}
