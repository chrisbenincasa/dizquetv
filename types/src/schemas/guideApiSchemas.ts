import z from 'zod';
import { PlexEpisodeSchema, PlexMovieSchema } from '../plex/index.js';
import { ChannelIconSchema } from './channelSchema.js';

export const ExternalSourceTypeSchema = z.enum(['plex']);

const BaseGuideProgramSchema = z.object({
  start: z.number(),
  stop: z.number(),
  persisted: z.boolean(),
  duration: z.number(),
});

export const FlexGuideProgramSchema = BaseGuideProgramSchema.extend({
  type: z.literal('flex'),
});

export const RedirectGuideProgramSchema = BaseGuideProgramSchema.extend({
  type: z.literal('redirect'),
  channel: z.number(),
});

export const ContentGuideProgramSchema = BaseGuideProgramSchema.extend({
  type: z.literal('content'),
  subtype: z.union([
    z.literal('movie'),
    z.literal('episode'),
    z.literal('track'),
  ]),
  id: z.string().optional(), // If persisted
  // Meta
  summary: z.string().optional(),
  date: z.string().optional(),
  rating: z.string().optional(),
  icon: z.string().optional(),
  title: z.string(), // If an episode, this is the show title
  episodeTitle: z.string().optional(),
  seasonNumber: z.number().optional(),
  episodeNumber: z.number().optional(),
  // TODO: Include track
  originalProgram: z
    .discriminatedUnion('type', [PlexEpisodeSchema, PlexMovieSchema])
    .optional(),
  externalSourceType: ExternalSourceTypeSchema.optional(),
  externalSourceName: z.string().optional(),
});
// Should be able to do this once we have https://github.com/colinhacks/zod/issues/2106
// .refine(
//   (val) =>
//     (!val.externalSourceName && !val.externalSourceType) ||
//     (val.externalSourceName && val.externalSourceType),
//   {
//     message:
//       'Must define neither externalSourceName / externalSourceType, or both.',
//   },
// );

export const CustomGuideProgramSchema = BaseGuideProgramSchema.extend({
  type: z.literal('custom'),
  id: z.string(),
  program: ContentGuideProgramSchema.optional(),
});

export const TvGuideProgramSchema = z.discriminatedUnion('type', [
  ContentGuideProgramSchema,
  CustomGuideProgramSchema,
  RedirectGuideProgramSchema,
  FlexGuideProgramSchema,
]);

export const ChannelLineupSchema = z.object({
  icon: ChannelIconSchema.optional(),
  name: z.string().optional(),
  number: z.number().optional(),
  programs: z.array(TvGuideProgramSchema),
});
