use ecdsa::Signature;
use k256::ecdsa::signature::Verifier;
use k256::ecdsa::VerifyingKey;
use k256::{ProjectivePoint, PublicKey, Secp256k1};

use crate::compat;
use crate::tecdsa::triples_2::generate_triples_3;
use crate::{
    compat::scalar_hash,
    protocol::Participant,
    tecdsa::{
        keygen_centralized::combine_shares,
        keygen_centralized::keygen_centralized,
        keygen_centralized::keygen_import,
        presign_2::presign_2,
        sign_2::sign_2,
    },
};

#[test]
fn test_keygen_centralized() {
    let participants = vec![Participant::from(0u32), Participant::from(1u32)];

    let threshold = 2;

    let keygen_result = keygen_centralized::<Secp256k1>(&participants, threshold).unwrap();

    let triples_participants = vec![Participant::from(0u32), Participant::from(1u32)];
    let triples_result = generate_triples_3::<Secp256k1>(&triples_participants, threshold).unwrap();

    let p_0_keygen_result = keygen_result.keygen_outputs.get(0).unwrap().clone();
    let p_1_keygen_result = keygen_result.keygen_outputs.get(1).unwrap().clone();

    let presign_result = {
        let triples_0 = triples_result.get(0).unwrap();
        let triples_1 = triples_result.get(1).unwrap();

        let p_0_pub0 = triples_0.pub_v.get(0).unwrap().clone();
        let p_0_pub1 = triples_0.pub_v.get(1).unwrap().clone();

        let p_0_shares0 = triples_0.share_v.get(0).clone().unwrap();
        let p_0_shares1 = triples_0.share_v.get(1).clone().unwrap();

        let p_1_pub0 = triples_1.pub_v.get(0).unwrap().clone();
        let p_1_pub1 = triples_1.pub_v.get(1).unwrap().clone();

        let p_1_shares0 = triples_1.share_v.get(0).clone().unwrap();
        let p_1_shares1 = triples_1.share_v.get(1).clone().unwrap();

        let p_0_triple_0 = (p_0_shares0.clone(), p_0_pub0);
        let p_0_triple_1 = (p_0_shares1.clone(), p_0_pub1);

        let p_1_triple_0 = (p_1_shares0.clone(), p_1_pub0);
        let p_1_triple_1 = (p_1_shares1.clone(), p_1_pub1);

        presign_2::<Secp256k1>(
            &triples_participants,
            threshold,
            p_0_triple_0,
            p_0_triple_1,
            p_1_triple_0,
            p_1_triple_1,
            p_0_keygen_result.clone(),
            p_1_keygen_result.clone(),
        )
        .unwrap()
    };

    let msg = b"hello world";
    let sign_result = {
        let msg_hash = scalar_hash(msg);

        let p_0_presignature = presign_result.get(0).unwrap().clone();
        let p_1_presignature = presign_result.get(1).unwrap().clone();

        sign_2::<Secp256k1>(
            &triples_participants,
            threshold,
            p_0_keygen_result.clone(),
            p_1_keygen_result.clone(),
            p_0_presignature.1.clone(),
            p_1_presignature.1.clone(),
            msg_hash,
        )
        .unwrap()
    };

    {
        // Verify sig!
        let p_0_sig = sign_result.get(0).unwrap().clone().1;
        let p_1_sig = sign_result.get(1).unwrap().clone().1;

        let p_0_public_key = keygen_result
            .keygen_outputs
            .get(0)
            .unwrap()
            .clone()
            .public_key;

        assert_eq!(p_0_sig.big_r, p_1_sig.big_r);
        assert_eq!(p_0_sig.s, p_1_sig.s);

        let sig =
            Signature::from_scalars(compat::x_coordinate::<Secp256k1>(&p_0_sig.big_r), p_0_sig.s)
                .unwrap();

        VerifyingKey::from(&PublicKey::from_affine(p_0_public_key).unwrap())
            .verify(&msg[..], &sig)
            .unwrap();
    }

    // combine test
    {
        let shares_to_combine = vec![
            (Participant::from(0u32), p_0_keygen_result.private_share),
            (Participant::from(1u32), p_1_keygen_result.private_share),
        ];

        // recover secret key
        let recovered_priv = combine_shares::<Secp256k1>(&shares_to_combine).unwrap();
        // recover public key
        let recovered_pub = (ProjectivePoint::GENERATOR * recovered_priv).to_affine();

        let expected_pub = keygen_result.keygen_outputs.get(0).unwrap().public_key;
        assert_eq!(recovered_pub, expected_pub);
        println!(
            "\n recovered_pub: {:#?}, expected_pub: {:#?}",
            recovered_pub, expected_pub
        );
    }
}

// Task 3.2: 2-of-2 keygen_import happy path — raw key → split → combine → original match

#[test]
fn test_keygen_import_2of2_roundtrip() {
    let participants = vec![Participant::from(0u32), Participant::from(1u32)];
    let secret: [u8; 32] = [
        0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
        0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x1b, 0x1c,
        0x1d, 0x1e, 0x1f, 0x20,
    ];

    let result = keygen_import::<Secp256k1>(secret, &participants, 2).unwrap();

    assert_eq!(result.keygen_outputs.len(), 2);

    let shares = vec![
        (participants[0], result.keygen_outputs[0].private_share),
        (participants[1], result.keygen_outputs[1].private_share),
    ];
    let recovered = combine_shares::<Secp256k1>(&shares).unwrap();
    assert_eq!(recovered, result.private_key);
}

#[test]
fn test_keygen_import_3of2_all_subsets_recover() {
    // 3 participants, threshold 2: any 2 should recover the secret
    let participants = vec![
        Participant::from(0u32),
        Participant::from(1u32),
        Participant::from(2u32),
    ];
    let secret: [u8; 32] = [0xABu8; 32];

    let result = keygen_import::<Secp256k1>(secret, &participants, 2).unwrap();
    assert_eq!(result.keygen_outputs.len(), 3);

    let shares_01 = vec![
        (participants[0], result.keygen_outputs[0].private_share),
        (participants[1], result.keygen_outputs[1].private_share),
    ];
    let shares_02 = vec![
        (participants[0], result.keygen_outputs[0].private_share),
        (participants[2], result.keygen_outputs[2].private_share),
    ];
    let shares_12 = vec![
        (participants[1], result.keygen_outputs[1].private_share),
        (participants[2], result.keygen_outputs[2].private_share),
    ];

    assert_eq!(
        combine_shares::<Secp256k1>(&shares_01).unwrap(),
        result.private_key
    );
    assert_eq!(
        combine_shares::<Secp256k1>(&shares_02).unwrap(),
        result.private_key
    );
    assert_eq!(
        combine_shares::<Secp256k1>(&shares_12).unwrap(),
        result.private_key
    );
}

// Task 3.3: participants count and threshold validation tests

#[test]
fn test_keygen_import_threshold_too_low_fails() {
    let participants = vec![Participant::from(0u32), Participant::from(1u32)];
    let secret: [u8; 32] = [0x01u8; 32];

    let result = keygen_import::<Secp256k1>(secret, &participants, 1);
    assert!(result.is_err(), "threshold=1 should fail");

    let result = keygen_import::<Secp256k1>(secret, &participants, 0);
    assert!(result.is_err(), "threshold=0 should fail");
}

#[test]
fn test_keygen_import_threshold_exceeds_participants_fails() {
    let participants = vec![Participant::from(0u32), Participant::from(1u32)];
    let secret: [u8; 32] = [0x01u8; 32];

    let result = keygen_import::<Secp256k1>(secret, &participants, 3);
    assert!(
        result.is_err(),
        "threshold > participants.len() should fail"
    );
}

#[test]
fn test_keygen_import_duplicate_participants_fails() {
    let participants = vec![Participant::from(0u32), Participant::from(0u32)];
    let secret: [u8; 32] = [0x01u8; 32];

    let result = keygen_import::<Secp256k1>(secret, &participants, 2);
    assert!(result.is_err(), "duplicate participants should fail");
}

#[test]
fn test_combine_shares_single_share_fails() {
    let participants = vec![Participant::from(0u32), Participant::from(1u32)];
    let secret: [u8; 32] = [0x01u8; 32];

    let result = keygen_import::<Secp256k1>(secret, &participants, 2).unwrap();
    let single_share = vec![(participants[0], result.keygen_outputs[0].private_share)];

    let combined = combine_shares::<Secp256k1>(&single_share);
    assert!(combined.is_err(), "single share should not be enough");
}

// Task 3.4: split result public key consistency

#[test]
fn test_keygen_import_public_key_matches_generator_times_secret() {
    let participants = vec![Participant::from(0u32), Participant::from(1u32)];
    let secret: [u8; 32] = [0x42u8; 32];

    let result = keygen_import::<Secp256k1>(secret, &participants, 2).unwrap();

    // All shares should have the same public key
    let pub0 = result.keygen_outputs[0].public_key;
    let pub1 = result.keygen_outputs[1].public_key;
    assert_eq!(pub0, pub1);

    // Public key must equal G * private_key
    let expected_pub = (ProjectivePoint::GENERATOR * result.private_key).to_affine();
    assert_eq!(pub0, expected_pub);
}

#[test]
fn test_keygen_import_recovered_public_key_matches() {
    let participants = vec![Participant::from(0u32), Participant::from(1u32)];
    let secret: [u8; 32] = [0x55u8; 32];

    let result = keygen_import::<Secp256k1>(secret, &participants, 2).unwrap();

    let shares = vec![
        (participants[0], result.keygen_outputs[0].private_share),
        (participants[1], result.keygen_outputs[1].private_share),
    ];
    let recovered_scalar = combine_shares::<Secp256k1>(&shares).unwrap();
    let recovered_pub = (ProjectivePoint::GENERATOR * recovered_scalar).to_affine();

    assert_eq!(recovered_pub, result.keygen_outputs[0].public_key);
}
