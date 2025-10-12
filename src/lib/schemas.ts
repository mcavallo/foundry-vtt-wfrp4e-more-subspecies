import {
  z,
  array as z_array,
  enum as z_enum,
  type infer as z_infer,
  number as z_number,
  object as z_object,
  string as z_string,
} from 'zod';

const DatasetNameSchema = z_string()
  .trim()
  .max(256)
  .regex(/^[\w\s()\-,'—]+$/, { message: 'Invalid dataset name' });

const SubspeciesNameSchema = z_string()
  .trim()
  .max(128)
  .regex(/^[\w\s*()\-,'—]+$/, { message: 'Invalid subspecies name' });

const SkillSchema = z_string()
  .trim()
  .regex(/^[A-Z][a-z]*( (?:[A-Z][a-z]*|of))*?( \([A-Z][a-zA-Z' \-—` ]*\))?$/, {
    message: 'Invalid skill',
  });

const TalentSchema = z_string()
  .trim()
  .regex(
    /^([A-Z][a-zA-Z-]*( [A-Z][a-zA-Z-]*)*( \([A-Za-z' \-—`]+\))?|random\[[1-9][0-9]*\]|[A-Z][a-zA-Z-]*( [A-Z][a-zA-Z-]*)*\/[A-Z][a-zA-Z-]*( [A-Z][a-zA-Z-]*)*)(, ([A-Z][a-zA-Z-]*( [A-Z][a-zA-Z-]*)*( \([A-Za-z' \-—`]+\))?|random\[[1-9][0-9]*\]|[A-Z][a-zA-Z-]*( [A-Z][a-zA-Z-]*)*\/[A-Z][a-zA-Z-]*( [A-Z][a-zA-Z-]*)*))*$/,
    { message: 'Invalid talent' }
  );

const DatasetIdSchema = z_string()
  .trim()
  .max(128)
  .regex(
    /^[a-z]+([._-][a-z0-9]+)*$/, // kebab-case or snake_case with optional dots
    { message: 'Invalid dataset id format' }
  );

const SubspeciesIdSchema = z_string()
  .trim()
  .max(128)
  .regex(
    /^[a-z]+([_-][a-z0-9]+)*$/, // kebab-case or snake_case
    { message: 'Invalid subspecies id format' }
  );

export const SpeciesEnumSchema = z_enum([
  'dwarf',
  'helf',
  'welf',
  'familiar',
  'gnome',
  'halfling',
  'human',
  'ogre',
]);

export const SubspeciesSchema = z_object({
  name: SubspeciesNameSchema,
  skills: z_array(SkillSchema).min(1, { error: 'Has no skills' }),
  talents: z_array(TalentSchema.or(z_number().int())).min(1, {
    error: 'Has no talents',
  }),
});

export const DatasetSubspeciesSchema = SubspeciesSchema.extend({
  id: SubspeciesIdSchema,
});

export const DatasetSchema = z_object({
  id: DatasetIdSchema,
  name: DatasetNameSchema,
  species: SpeciesEnumSchema,
  entries: z_array(DatasetSubspeciesSchema).min(1, { error: 'Has no subspecies' }),
});

export type SpeciesEnum = z_infer<typeof SpeciesEnumSchema>;
export type Subspecies = z_infer<typeof SubspeciesSchema>;
export type DatasetSubspecies = z_infer<typeof DatasetSubspeciesSchema>;
export type Dataset = z_infer<typeof DatasetSchema>;
