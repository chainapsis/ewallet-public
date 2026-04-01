use elliptic_curve::{group::Curve, CurveArithmetic, Group, ScalarPrimitive};
use rand_core::OsRng;

use crate::{
    keyshare::CentralizedKeygenOutput,
    math::Polynomial,
    participants::ParticipantList,
    protocol::{Participant, ProtocolError},
    CSCurve, KeygenOutput,
};

pub fn keygen_centralized<C: CSCurve>(
    participants: &[Participant],
    threshold: usize,
) -> Result<CentralizedKeygenOutput<C>, ProtocolError> {
    if threshold < 2 {
        return Err(ProtocolError::AssertionFailed(
            "threshold must be >= 2".to_string(),
        ));
    }

    if threshold > participants.len() {
        return Err(ProtocolError::AssertionFailed(
            "threshold must be <= number of participants".to_string(),
        ));
    }

    let _participant_list =
        ParticipantList::new(participants).ok_or_else(|| {
            ProtocolError::AssertionFailed(
                "participant list cannot contain duplicates".to_string(),
            )
        })?;

    let mut rng = OsRng;
    let f = Polynomial::<C>::random(&mut rng, threshold);

    let big_x_projective = C::ProjectivePoint::generator() * f.evaluate_zero();
    let big_x_affine = big_x_projective.to_affine();

    let mut results = Vec::with_capacity(participants.len());
    for &p in participants {
        let share_i = f.evaluate(&p.scalar::<C>());
        let key_out = KeygenOutput {
            private_share: share_i,
            public_key: big_x_affine,
        };
        results.push(key_out);
    }

    Ok(CentralizedKeygenOutput {
        private_key: f.evaluate_zero(),
        keygen_outputs: results,
    })
}

pub fn keygen_import<C: CSCurve>(
    secret: [u8; 32],
    participants: &[Participant],
    threshold: usize,
) -> Result<CentralizedKeygenOutput<C>, ProtocolError> {
    if threshold < 2 {
        return Err(ProtocolError::AssertionFailed(
            "threshold must be >= 2".to_string(),
        ));
    }

    if threshold > participants.len() {
        return Err(ProtocolError::AssertionFailed(
            "threshold must be <= number of participants".to_string(),
        ));
    }

    let _participant_list =
        ParticipantList::new(participants).ok_or_else(|| {
            ProtocolError::AssertionFailed(
                "participant list cannot contain duplicates".to_string(),
            )
        })?;

    let secret_scalar = ScalarPrimitive::<C>::from_slice(&secret)
        .map_err(|_| ProtocolError::Other("Failed to convert secret to scalar".into()))?;
    let constant = C::Scalar::from(secret_scalar);

    let mut rng = OsRng;
    let f = Polynomial::<C>::extend_random(&mut rng, threshold, &constant);

    let big_x_projective = C::ProjectivePoint::generator() * f.evaluate_zero();
    let big_x_affine = big_x_projective.to_affine();

    let mut results = Vec::with_capacity(participants.len());
    for &p in participants {
        let share_i = f.evaluate(&p.scalar::<C>());
        let key_out = KeygenOutput {
            private_share: share_i,
            public_key: big_x_affine,
        };
        results.push(key_out);
    }

    debug_assert!(f.evaluate_zero() == constant);

    Ok(CentralizedKeygenOutput {
        private_key: f.evaluate_zero(),
        keygen_outputs: results,
    })
}

pub fn combine_shares<C: CSCurve>(
    shares: &[(Participant, <C as CurveArithmetic>::Scalar)],
) -> Result<<C as CurveArithmetic>::Scalar, ProtocolError> {
    if shares.len() < 2 {
        return Err(ProtocolError::Other(
            "Need at least 2 shares to reconstruct".into(),
        ));
    }

    let participants: Vec<Participant> = shares.iter().map(|(p, _)| *p).collect();
    let participant_list = ParticipantList::new(&participants)
        .ok_or_else(|| ProtocolError::Other("participant list contains duplicates".into()))?;

    let mut result = C::Scalar::default();

    for (_, (p_i, share_i)) in shares.iter().enumerate() {
        let lambda_i = participant_list.lagrange::<C>(*p_i);

        result += *share_i * lambda_i;
    }

    Ok(result)
}
