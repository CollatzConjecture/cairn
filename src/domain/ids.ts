import { z } from 'zod';

export const TaskIdSchema = z.string().brand<'TaskId'>();
export const ProjectIdSchema = z.string().brand<'ProjectId'>();
export const MemberIdSchema = z.string().brand<'MemberId'>();
export const TeamIdSchema = z.string().brand<'TeamId'>();
export const SubtaskIdSchema = z.string().brand<'SubtaskId'>();
export const CommentIdSchema = z.string().brand<'CommentId'>();
export const ActivityIdSchema = z.string().brand<'ActivityId'>();
export const NotifIdSchema = z.string().brand<'NotifId'>();
/** Project files and task attachments share ids: an upload to a task creates both under one id. */
export const FileIdSchema = z.string().brand<'FileId'>();
export const EventIdSchema = z.string().brand<'EventId'>();
export const ViewIdSchema = z.string().brand<'ViewId'>();
export const WorkspaceIdSchema = z.string().brand<'WorkspaceId'>();
export const SessionIdSchema = z.string().brand<'SessionId'>();
export const UploadIdSchema = z.string().brand<'UploadId'>();

export type TaskId = z.infer<typeof TaskIdSchema>;
export type ProjectId = z.infer<typeof ProjectIdSchema>;
export type MemberId = z.infer<typeof MemberIdSchema>;
export type TeamId = z.infer<typeof TeamIdSchema>;
export type SubtaskId = z.infer<typeof SubtaskIdSchema>;
export type CommentId = z.infer<typeof CommentIdSchema>;
export type ActivityId = z.infer<typeof ActivityIdSchema>;
export type NotifId = z.infer<typeof NotifIdSchema>;
export type FileId = z.infer<typeof FileIdSchema>;
export type EventId = z.infer<typeof EventIdSchema>;
export type ViewId = z.infer<typeof ViewIdSchema>;
export type WorkspaceId = z.infer<typeof WorkspaceIdSchema>;
export type SessionId = z.infer<typeof SessionIdSchema>;
export type UploadId = z.infer<typeof UploadIdSchema>;

/** A prefix plus six random base-36 characters. */
export const uid = (prefix: string) => prefix + Math.random().toString(36).slice(2, 8);

/** Id constructors. Use these for ids that come from URLs, the seed, or new entities; parsed data is already branded. */
export const taskId = (s: string) => s as TaskId;
export const projectId = (s: string) => s as ProjectId;
export const memberId = (s: string) => s as MemberId;
export const teamId = (s: string) => s as TeamId;
export const subtaskId = (s: string) => s as SubtaskId;
export const commentId = (s: string) => s as CommentId;
export const activityId = (s: string) => s as ActivityId;
export const notifId = (s: string) => s as NotifId;
export const fileId = (s: string) => s as FileId;
export const eventId = (s: string) => s as EventId;
export const viewId = (s: string) => s as ViewId;
export const workspaceId = (s: string) => s as WorkspaceId;
export const sessionId = (s: string) => s as SessionId;
export const uploadId = (s: string) => s as UploadId;
