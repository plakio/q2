<?php
/**
 * Q2-specific policy capabilities.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Owns the small set of policies not represented by Core capabilities.
 */
final class Capabilities {
	public const MANAGE = 'manage_q2';

	/**
	 * Grants Q2 management capability to administrators on activation.
	 */
	public static function activate(): void {
		$role = get_role( 'administrator' );
		if ( null === $role ) {
			return;
		}

		$role->add_cap( self::MANAGE );
	}
}
