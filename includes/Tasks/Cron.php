<?php
/**
 * Daily task reminder cron.
 *
 * @package Q2
 */

declare( strict_types=1 );

namespace Q2\Tasks;

use Q2\Collaboration\Repository as Collaboration;

defined( 'ABSPATH' ) || exit;

/**
 * Sends due-soon notifications once per day with deduplicated delivery.
 */
final class Cron {
	public const HOOK       = 'q2_tasks_daily_reminder';
	public const SCHEDULE   = 'daily';
	private const LOOKAHEAD = '+1 day';

	/**
	 * Tasks persistence gateway.
	 *
	 * @var Repository
	 */
	private Repository $tasks;

	/**
	 * Collaboration persistence gateway.
	 *
	 * @var Collaboration
	 */
	private Collaboration $collaboration;

	/**
	 * Creates the cron service.
	 */
	public function __construct() {
		$this->tasks         = new Repository();
		$this->collaboration = new Collaboration();
	}

	/**
	 * Hooks cron lifecycle.
	 */
	public function register(): void {
		add_filter( 'cron_schedules', array( $this, 'register_schedule' ) );
		add_action( self::HOOK, array( $this, 'run_reminders' ) );
		add_action( 'q2_tasks_due_changed', array( __CLASS__, 'ensure_scheduled' ) );
		self::ensure_scheduled();
	}

	/**
	 * Registers the daily schedule if missing.
	 *
	 * @param array<string, array<string, mixed>> $schedules Existing schedules.
	 * @return array<string, array<string, mixed>>
	 */
	public function register_schedule( array $schedules ): array {
		if ( isset( $schedules[ self::SCHEDULE ] ) ) {
			return $schedules;
		}
		$schedules[ self::SCHEDULE ] = array(
			'interval' => DAY_IN_SECONDS,
			'display'  => __( 'Once per day', 'q2' ),
		);
		return $schedules;
	}

	/**
	 * Schedules the reminder event if it is not already pending.
	 */
	public static function ensure_scheduled(): void {
		if ( ! function_exists( 'wp_next_scheduled' ) ) {
			return;
		}
		if ( false === wp_next_scheduled( self::HOOK ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, self::SCHEDULE, self::HOOK );
		}
	}

	/**
	 * Iterates upcoming tasks and emits due-soon notifications.
	 *
	 * Notifications are deduplicated by `(task, due_date, recipient)` so the
	 * daily run does not spam recipients who never marked previous rows read.
	 */
	public function run_reminders(): void {
		$today  = current_time( 'Y-m-d' );
		$cutoff = gmdate( 'Y-m-d', strtotime( $today . ' ' . self::LOOKAHEAD ) );

		foreach ( (array) $this->tasks->due_on_or_before( $cutoff ) as $row ) {
			if ( isset( $row->status ) && 'done' === (string) $row->status ) {
				continue;
			}
			$task_id       = (int) $row->id;
			$parent_id     = (int) $row->parent_post_id;
			$actor_id      = (int) $row->actor_user_id;
			$block_id      = (string) $row->block_id;
			$due_iso       = (string) $row->due_date;
			$due_date_safe = $due_iso ? $due_iso : $today;

			$recipients = $this->recipient_ids( $row->assignees );
			if ( $actor_id > 0 && ! in_array( $actor_id, $recipients, true ) ) {
				$recipients[] = $actor_id;
			}
			if ( empty( $recipients ) ) {
				continue;
			}

			foreach ( $recipients as $user_id ) {
				$this->collaboration->notify(
					array(
						'user_id'       => (int) $user_id,
						'actor_user_id' => $actor_id,
						'type'          => 'task_due_soon',
						'object_type'   => 'post',
						'object_id'     => $parent_id,
						'payload'       => array(
							'block_id' => $block_id,
							'task_id'  => $task_id,
							'title'    => (string) $row->title,
							'due_date' => $due_date_safe,
							'status'   => (string) $row->status,
						),
						'dedupe_key'    => sprintf( 'task_due:%d:%s:%d', $task_id, $due_date_safe, (int) $user_id ),
					)
				);
			}
		}
	}

	/**
	 * Decodes assignees JSON and resolves valid member user IDs.
	 *
	 * @param string|null $encoded JSON encoded assignees.
	 * @return int[]
	 */
	private function recipient_ids( ?string $encoded ): array {
		if ( empty( $encoded ) ) {
			return array();
		}
		$decoded = json_decode( (string) $encoded, true );
		if ( ! is_array( $decoded ) ) {
			return array();
		}
		$result = array();
		foreach ( $decoded as $user_id ) {
			$user = get_userdata( (int) $user_id );
			if ( $user && is_user_member_of_blog( (int) $user_id ) ) {
				$result[] = (int) $user_id;
			}
		}
		return $result;
	}
}
