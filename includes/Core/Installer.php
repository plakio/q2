<?php
/**
 * Q2 database migrations.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Core;

defined( 'ABSPATH' ) || exit;

/**
 * Creates and upgrades Q2-owned collaboration tables.
 */
final class Installer {
	private const DB_VERSION = '2';

	/**
	 * Runs pending schema migrations.
	 */
	public static function maybe_upgrade(): void {
		if ( self::DB_VERSION === get_option( 'q2_db_version' ) ) {
			return;
		}

		self::install();
	}

	/**
	 * Installs current Q2 collaboration tables.
	 */
	public static function install(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset = $wpdb->get_charset_collate();
		$prefix  = $wpdb->prefix . 'q2_';

		dbDelta(
			"CREATE TABLE {$prefix}notifications (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				user_id bigint(20) unsigned NOT NULL,
				actor_user_id bigint(20) unsigned NOT NULL DEFAULT 0,
				type varchar(40) NOT NULL,
				object_type varchar(20) NOT NULL,
				object_id bigint(20) unsigned NOT NULL,
				secondary_object_type varchar(20) NOT NULL DEFAULT '',
				secondary_object_id bigint(20) unsigned NOT NULL DEFAULT 0,
				payload longtext NULL,
				dedupe_key varchar(191) NULL,
				created_at datetime NOT NULL,
				read_at datetime NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY dedupe_key (dedupe_key),
				KEY recipient_unread (user_id,read_at,created_at,id),
				KEY recipient_type (user_id,type,created_at),
				KEY object (object_type,object_id)
			) {$charset};"
		);

		dbDelta(
			"CREATE TABLE {$prefix}reads (
				user_id bigint(20) unsigned NOT NULL,
				object_type varchar(20) NOT NULL,
				object_id bigint(20) unsigned NOT NULL,
				last_seen_event_id bigint(20) unsigned NOT NULL DEFAULT 0,
				read_at datetime NOT NULL,
				PRIMARY KEY  (user_id,object_type,object_id),
				KEY recipient_read (user_id,read_at)
			) {$charset};"
		);

		dbDelta(
			"CREATE TABLE {$prefix}follows (
				user_id bigint(20) unsigned NOT NULL,
				object_type varchar(20) NOT NULL,
				object_id bigint(20) unsigned NOT NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (user_id,object_type,object_id),
				KEY object_followers (object_type,object_id,user_id)
			) {$charset};"
		);

		dbDelta(
			"CREATE TABLE {$prefix}reactions (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				user_id bigint(20) unsigned NOT NULL,
				object_type varchar(20) NOT NULL,
				object_id bigint(20) unsigned NOT NULL,
				reaction varchar(32) NOT NULL DEFAULT 'like',
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY user_reaction (user_id,object_type,object_id,reaction),
				KEY object_reactions (object_type,object_id,reaction)
			) {$charset};"
		);

		dbDelta(
			"CREATE TABLE {$prefix}mentions (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				mentioned_user_id bigint(20) unsigned NOT NULL,
				actor_user_id bigint(20) unsigned NOT NULL DEFAULT 0,
				object_type varchar(20) NOT NULL,
				object_id bigint(20) unsigned NOT NULL,
				parent_post_id bigint(20) unsigned NOT NULL DEFAULT 0,
				mention_key varchar(60) NOT NULL,
				created_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY recipient_object (mentioned_user_id,object_type,object_id),
				KEY recipient_mentions (mentioned_user_id,created_at),
				KEY object_mentions (object_type,object_id)
			) {$charset};"
		);

		dbDelta(
			"CREATE TABLE {$prefix}tasks (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				block_id varchar(64) NOT NULL,
				parent_post_id bigint(20) unsigned NOT NULL,
				actor_user_id bigint(20) unsigned NOT NULL DEFAULT 0,
				title varchar(255) NOT NULL,
				status varchar(20) NOT NULL DEFAULT 'todo',
				due_date date NULL,
				assignees longtext NULL,
				version bigint(20) unsigned NOT NULL DEFAULT 1,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY block_id (block_id),
				KEY parent_post (parent_post_id,status,due_date),
				KEY assignee_status (status,due_date),
				KEY parent_due (parent_post_id,due_date)
			) {$charset};"
		);

		update_option( 'q2_db_version', self::DB_VERSION, false );
	}
}
