<?php
/**
 * Transactional emails for collaboration events.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Collaboration;

defined( 'ABSPATH' ) || exit;

use Q2\Editor\EditorFrame;

/**
 * Sends email counterparts for mentions and followed-thread comments.
 */
final class Emails {
	/**
	 * Hooks email delivery into collaboration events.
	 */
	public static function register(): void {
		add_action( 'q2_notification_created', array( __CLASS__, 'maybe_send_notification_email' ) );
	}

	/**
	 * Emails the recipient of a newly created mention or comment notification.
	 *
	 * @param array<string, mixed> $data Notification values.
	 */
	public static function maybe_send_notification_email( array $data ): void {
		$type = (string) ( $data['type'] ?? '' );
		if ( 'mention' === $type ) {
			self::send_mention_email( $data );
		} elseif ( 'comment' === $type ) {
			self::send_comment_email( $data );
		}
	}

	/**
	 * Emails the recipient of a mention notification.
	 *
	 * @param array<string, mixed> $data Notification values.
	 */
	private static function send_mention_email( array $data ): void {
		$post_id = (int) ( $data['object_id'] ?? 0 );
		$post    = get_post( $post_id );
		if ( ! $post instanceof \WP_Post ) {
			return;
		}

		$actor = get_userdata( (int) $data['actor_user_id'] );
		$title = get_the_title( $post );
		if ( '' === $title ) {
			$title = __( 'Untitled', 'q2' );
		}

		self::send(
			(int) $data['user_id'],
			sprintf(
				/* translators: 1: mention author, 2: post title. */
				__( '%1$s mentioned you in %2$s', 'q2' ),
				$actor ? $actor->display_name : __( 'Someone', 'q2' ),
				$title
			),
			sprintf(
				/* translators: 1: mention author, 2: post title. */
				__( '%1$s mentioned you in "%2$s".', 'q2' ),
				$actor ? $actor->display_name : __( 'Someone', 'q2' ),
				$title
			),
			$post_id
		);
	}

	/**
	 * Emails a follower about a new comment on the followed post.
	 *
	 * @param array<string, mixed> $data Notification values.
	 */
	private static function send_comment_email( array $data ): void {
		$post_id = (int) ( $data['object_id'] ?? 0 );
		$post    = get_post( $post_id );
		if ( ! $post instanceof \WP_Post ) {
			return;
		}

		$actor = get_userdata( (int) $data['actor_user_id'] );
		$title = get_the_title( $post );
		if ( '' === $title ) {
			$title = __( 'Untitled', 'q2' );
		}

		$excerpt = '';
		$comment = get_comment( (int) ( $data['secondary_object_id'] ?? 0 ) );
		if ( $comment instanceof \WP_Comment ) {
			$excerpt = wp_trim_words( wp_strip_all_tags( $comment->comment_content ), 24 );
		}

		$intro = sprintf(
			/* translators: 1: comment author, 2: post title. */
			__( '%1$s commented on "%2$s".', 'q2' ),
			$actor ? $actor->display_name : __( 'Someone', 'q2' ),
			$title
		);
		if ( '' !== $excerpt ) {
			$intro .= "\n\n" . $excerpt;
		}

		self::send(
			(int) $data['user_id'],
			sprintf(
				/* translators: 1: comment author, 2: post title. */
				__( '%1$s commented on %2$s', 'q2' ),
				$actor ? $actor->display_name : __( 'Someone', 'q2' ),
				$title
			),
			$intro,
			$post_id
		);
	}

	/**
	 * Delivers a workspace email with an in-app deep link.
	 *
	 * @param int    $user_id Recipient user ID.
	 * @param string $subject Email subject without site prefix.
	 * @param string $intro   First body line.
	 * @param int    $post_id Related post ID for the deep link.
	 */
	private static function send( int $user_id, string $subject, string $intro, int $post_id ): void {
		$user = get_userdata( $user_id );
		if ( ! $user instanceof \WP_User || '' === $user->user_email ) {
			return;
		}

		$link = EditorFrame::q2_view_url( $post_id );
		if ( '' === $link ) {
			$link = home_url( '/q2/' );
		}

		$site = get_bloginfo( 'name' );
		$body = sprintf(
			/* translators: 1: recipient display name. */
			__( 'Hi %1$s,', 'q2' ),
			$user->display_name
		) . "\n\n" . $intro . "\n\n" . $link . "\n\n--\n" . sprintf(
			/* translators: %s: site name. */
			__( '%s workspace', 'q2' ),
			$site
		);

		wp_mail(
			$user->user_email,
			'[' . $site . '] ' . $subject,
			$body
		);
	}
}
