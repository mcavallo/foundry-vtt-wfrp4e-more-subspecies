export const DUMMY_SKILLS_AND_TALENTS = {
  skills: ['skill1', 'skill2'],
  talents: ['talent1', 'talent2'],
};

export const RAW_DATA = {
  dwarf: { dwarf_core: { name: 'Dwarf Core', ...DUMMY_SKILLS_AND_TALENTS } },
  halfling: { halfling_core: { name: 'Halfling Core', ...DUMMY_SKILLS_AND_TALENTS } },
  helf: { helf_core: { name: 'Helf Core', ...DUMMY_SKILLS_AND_TALENTS } },
  human: { human_core: { name: 'Human Core', ...DUMMY_SKILLS_AND_TALENTS } },
  welf: { welf_core: { name: 'Welf Core', ...DUMMY_SKILLS_AND_TALENTS } },
};

export const CUSTOM_DATA = {
  dwarf_custom_1: {
    id: 'dwarf_custom_1',
    species: 'dwarf',
    entries: [
      { id: 'dwarf_custom_1', name: 'Dwarf Custom 1', ...DUMMY_SKILLS_AND_TALENTS },
    ],
  },
  human_custom_1: {
    id: 'human_custom_1',
    species: 'human',
    entries: [
      { id: 'human_custom_2', name: 'Human Custom 2', ...DUMMY_SKILLS_AND_TALENTS },
      { id: 'human_custom_1', name: 'Human Custom 1', ...DUMMY_SKILLS_AND_TALENTS },
    ],
  },
};
