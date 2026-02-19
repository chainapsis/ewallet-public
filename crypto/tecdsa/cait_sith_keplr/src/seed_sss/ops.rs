use rand_core::OsRng;

use crate::sss::Point256;
use crate::sss::ReshareResult;

use super::field::{poly_evaluate, FieldElement};

/// Split a 32-byte secret into shares using a 257-bit prime field.
///
/// Returns one Point256 per evaluation point (ks_node_hash).
/// The polynomial has degree (t-1), so t shares are needed to reconstruct.
pub fn seed_split(
    secret: [u8; 32],
    ks_node_hashes: Vec<[u8; 32]>,
    t: u32,
) -> Result<Vec<Point256>, String> {
    if (ks_node_hashes.len() as u32) < t {
        return Err("KS node hashes must be greater than or equal to t".to_string());
    }
    if t < 2 {
        return Err("t must be at least 2".to_string());
    }

    let mut rng = OsRng;

    // Build polynomial: coefficients[0] = secret, rest random
    let mut coefficients = Vec::with_capacity(t as usize);
    coefficients.push(FieldElement::from_bytes(&secret));
    for _ in 1..t {
        coefficients.push(FieldElement::random(&mut rng));
    }

    // Evaluate at each x
    let mut points = Vec::with_capacity(ks_node_hashes.len());
    for hash in &ks_node_hashes {
        let x = FieldElement::from_bytes(hash);
        let y = poly_evaluate(&coefficients, &x);
        let y_bytes = y
            .to_bytes()
            .map_err(|e| format!("Share y exceeds 32 bytes: {}", e))?;
        points.push(Point256 { x: *hash, y: y_bytes });
    }

    Ok(points)
}

/// Recover the secret from t shares via Lagrange interpolation at x=0.
pub fn seed_combine(split_points: Vec<Point256>, t: u32) -> Result<[u8; 32], String> {
    if split_points.len() < t as usize {
        return Err("Not enough shares to reconstruct".to_string());
    }
    if t < 2 {
        return Err("t must be at least 2".to_string());
    }

    let points: Vec<_> = split_points.iter().take(t as usize).collect();
    validate_points(&points)?;

    let mut secret = FieldElement::zero();

    for (i, pi) in points.iter().enumerate() {
        let yi = FieldElement::from_bytes(&pi.y);
        let li = lagrange_at_zero(&points, i)?;
        secret = secret.add(&yi.mul(&li));
    }

    secret.to_bytes()
}

/// Expand existing shares to additional nodes without changing the polynomial.
///
/// Returns all original points + new points for additional nodes, and the recovered secret.
pub fn seed_expand_shares(
    split_points: Vec<Point256>,
    additional_ks_node_hashes: Vec<[u8; 32]>,
    t: u32,
) -> Result<ReshareResult, String> {
    if split_points.len() < t as usize {
        return Err("Not enough shares to expand".to_string());
    }
    if t < 2 {
        return Err("t must be at least 2".to_string());
    }

    // Check no overlap between existing and additional
    for sp in &split_points {
        for new_hash in &additional_ks_node_hashes {
            if sp.x == *new_hash {
                return Err("Additional hash already exists in split points".to_string());
            }
        }
    }

    let basis_points: Vec<_> = split_points.iter().take(t as usize).collect();
    validate_points(&basis_points)?;

    // Recover secret (for return value)
    let mut secret_fe = FieldElement::zero();
    for (i, pi) in basis_points.iter().enumerate() {
        let yi = FieldElement::from_bytes(&pi.y);
        let li = lagrange_at_zero(&basis_points, i)?;
        secret_fe = secret_fe.add(&yi.mul(&li));
    }
    let secret = secret_fe.to_bytes()?;

    // Compute new shares by interpolating at each new x
    let mut new_points = Vec::with_capacity(additional_ks_node_hashes.len());
    for new_hash in &additional_ks_node_hashes {
        let new_x = FieldElement::from_bytes(new_hash);
        let mut y = FieldElement::zero();
        for (i, pi) in basis_points.iter().enumerate() {
            let yi = FieldElement::from_bytes(&pi.y);
            let li = lagrange_at_x(&basis_points, i, &new_x)?;
            y = y.add(&yi.mul(&li));
        }
        let y_bytes = y
            .to_bytes()
            .map_err(|e| format!("New share y exceeds 32 bytes: {}", e))?;
        new_points.push(Point256 {
            x: *new_hash,
            y: y_bytes,
        });
    }

    let reshared_points = [split_points, new_points].concat();

    Ok(ReshareResult {
        t,
        reshared_points,
        secret,
    })
}

/// Lagrange coefficient L_i(0) = ∏_{j≠i} x_j / (x_j - x_i)
fn lagrange_at_zero(points: &[&Point256], i: usize) -> Result<FieldElement, String> {
    let xi = FieldElement::from_bytes(&points[i].x);
    let mut num = FieldElement::one();
    let mut den = FieldElement::one();

    for (j, pj) in points.iter().enumerate() {
        if j == i {
            continue;
        }
        let xj = FieldElement::from_bytes(&pj.x);
        num = num.mul(&xj);
        den = den.mul(&xj.sub(&xi));
    }

    let den_inv = den.inv()?;
    Ok(num.mul(&den_inv))
}

/// Lagrange coefficient L_i(target) = ∏_{j≠i} (x_j - target) / (x_j - x_i)
fn lagrange_at_x(
    points: &[&Point256],
    i: usize,
    target: &FieldElement,
) -> Result<FieldElement, String> {
    let xi = FieldElement::from_bytes(&points[i].x);
    let mut num = FieldElement::one();
    let mut den = FieldElement::one();

    for (j, pj) in points.iter().enumerate() {
        if j == i {
            continue;
        }
        let xj = FieldElement::from_bytes(&pj.x);
        num = num.mul(&xj.sub(target));
        den = den.mul(&xj.sub(&xi));
    }

    let den_inv = den.inv()?;
    Ok(num.mul(&den_inv))
}

/// Validate that no x-coordinate is zero and no duplicates exist.
fn validate_points(points: &[&Point256]) -> Result<(), String> {
    for (i, p) in points.iter().enumerate() {
        if p.x == [0u8; 32] {
            return Err("x-coordinate cannot be zero".to_string());
        }
        for j in (i + 1)..points.len() {
            if p.x == points[j].x {
                return Err("Duplicate x-coordinate".to_string());
            }
        }
    }
    Ok(())
}
