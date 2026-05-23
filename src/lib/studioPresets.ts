// Catalog of model + South African-inspired scene presets for the AI Fashion Studio.

export type Aesthetic = 'streetwear' | 'luxury' | 'casual' | 'high-fashion' | 'township';

export interface ModelPreset {
  id: string;
  label: string;
  gender: 'female' | 'male' | 'non-binary';
  bodyType: 'slim' | 'athletic' | 'curvy' | 'plus' | 'tall';
  skinTone: 'deep' | 'dark' | 'brown' | 'tan' | 'light';
  defaultAesthetic: Aesthetic;
}

export interface ScenePreset {
  id: string;
  label: string;
  category: 'Urban' | 'Township' | 'Shopping' | 'Nature';
  description: string;
  prompt: string;
}

export const AESTHETIC_LABELS: Record<Aesthetic, string> = {
  streetwear: 'Streetwear',
  luxury: 'Luxury',
  casual: 'Casual',
  'high-fashion': 'High Fashion',
  township: 'Township',
};

export const MODEL_PRESETS: ModelPreset[] = [
  { id: 'f-curvy-deep', label: 'Curvy · Deep tone', gender: 'female', bodyType: 'curvy', skinTone: 'deep', defaultAesthetic: 'high-fashion' },
  { id: 'f-athletic-brown', label: 'Athletic · Brown tone', gender: 'female', bodyType: 'athletic', skinTone: 'brown', defaultAesthetic: 'streetwear' },
  { id: 'f-tall-dark', label: 'Tall · Dark tone', gender: 'female', bodyType: 'tall', skinTone: 'dark', defaultAesthetic: 'luxury' },
  { id: 'f-plus-tan', label: 'Plus · Tan tone', gender: 'female', bodyType: 'plus', skinTone: 'tan', defaultAesthetic: 'casual' },
  { id: 'm-athletic-deep', label: 'Athletic · Deep tone', gender: 'male', bodyType: 'athletic', skinTone: 'deep', defaultAesthetic: 'streetwear' },
  { id: 'm-tall-brown', label: 'Tall · Brown tone', gender: 'male', bodyType: 'tall', skinTone: 'brown', defaultAesthetic: 'luxury' },
  { id: 'm-slim-dark', label: 'Slim · Dark tone', gender: 'male', bodyType: 'slim', skinTone: 'dark', defaultAesthetic: 'high-fashion' },
  { id: 'nb-athletic-brown', label: 'Androgynous · Brown tone', gender: 'non-binary', bodyType: 'athletic', skinTone: 'brown', defaultAesthetic: 'township' },
];

export const SCENE_PRESETS: ScenePreset[] = [
  // Urban
  { id: 'braamfontein', label: 'Braamfontein Streetwear', category: 'Urban', description: 'Inner-city Johannesburg energy, murals, golden afternoon light.', prompt: 'a South African inner-city street inspired by Braamfontein Johannesburg, bold street murals, late-afternoon golden hour light, busy urban atmosphere' },
  { id: 'pretoria-cbd', label: 'Pretoria CBD', category: 'Urban', description: 'Jacaranda-lined Gauteng avenues with civic architecture.', prompt: 'a Gauteng inner-city avenue inspired by Pretoria, jacaranda trees in bloom, soft warm daylight, civic architecture in the background' },
  { id: 'durban-beachfront', label: 'Durban Beachfront', category: 'Urban', description: 'Golden Mile palm trees, sea breeze, Indian Ocean light.', prompt: 'a South African coastal promenade inspired by Durban beachfront, palm trees, warm soft Indian-Ocean light, sand and ocean visible' },
  { id: 'cape-town-city', label: 'Cape Town City', category: 'Urban', description: 'Table-Mountain-backed downtown with crisp Atlantic light.', prompt: 'a South African downtown street inspired by Cape Town with Table Mountain silhouetted in the background, bright Atlantic daylight' },
  { id: 'sandton-luxury', label: 'Sandton Luxury District', category: 'Urban', description: 'Glass skyscrapers, polished plazas, premium financial-district vibe.', prompt: 'a luxury South African business district inspired by Sandton, glass skyscrapers, polished granite plaza, premium ambient light' },

  // Township
  { id: 'kasi-streetwear', label: 'Kasi Streetwear', category: 'Township', description: 'Vibrant kasi street with painted walls and authentic culture.', prompt: 'a vibrant South African township street, painted concrete walls, washing lines and youth culture, late afternoon sunlight, authentic kasi vibe' },
  { id: 'basketball-court', label: 'Township Basketball Court', category: 'Township', description: 'Concrete court, chain-link fence, dusk floodlights.', prompt: 'an outdoor concrete basketball court in a South African township, chain-link fence, dusk lighting, authentic urban youth atmosphere' },
  { id: 'taxi-rank', label: 'Taxi Rank Lifestyle', category: 'Township', description: 'Iconic minibus taxis, bustling commuter rank.', prompt: 'a bustling South African minibus taxi rank, colourful minibuses, daytime, authentic commuter atmosphere, candid street life' },
  { id: 'spaza-shop', label: 'Spaza Shop Corner', category: 'Township', description: 'Painted spaza shop facade with hand-painted signage.', prompt: 'a colourful South African spaza shop corner, hand-painted signage, warm daylight, authentic township storefront' },
  { id: 'fashion-street', label: 'Township Fashion Street', category: 'Township', description: 'Locals styled in bold prints, golden hour, kasi catwalk vibe.', prompt: 'a sunlit South African township fashion street scene with painted walls and bold backdrops, golden hour catwalk energy' },

  // Shopping
  { id: 'luxury-mall', label: 'African-Inspired Luxury Mall', category: 'Shopping', description: 'Polished interior with African design accents.', prompt: 'a luxury shopping mall interior with African design accents, polished marble floors, warm spotlighting, premium retail ambience (no real brand names or logos)' },
  { id: 'boutique', label: 'Boutique Fashion', category: 'Shopping', description: 'Minimalist concept-store interior with soft daylight.', prompt: 'a minimalist concept fashion boutique interior, neutral walls, soft daylight, racks of curated clothing, premium retail mood' },
  { id: 'sneaker-retail', label: 'Sneaker Culture Retail', category: 'Shopping', description: 'Sneaker-store backdrop with vibrant LED accents.', prompt: 'a sneaker culture retail interior, illuminated shoe walls, neon accents, urban premium retail atmosphere' },

  // Nature
  { id: 'african-sunset', label: 'African Sunset', category: 'Nature', description: 'Wide savannah horizon glowing orange and pink.', prompt: 'a cinematic African sunset over open savannah, glowing orange and pink sky, warm rim light, dramatic horizon' },
  { id: 'coastal-sa', label: 'Coastal South Africa', category: 'Nature', description: 'Rocky Atlantic coastline with crisp ocean light.', prompt: 'a dramatic South African coastline, rocky shore, crashing Atlantic waves, crisp natural daylight' },
  { id: 'safari-luxury', label: 'Safari Luxury', category: 'Nature', description: 'Acacia trees, dust haze, golden Big-Five-country light.', prompt: 'a luxury South African safari setting, acacia trees, golden dust-haze sunlight, premium editorial mood (no animals required)' },
];

export const SCENE_CATEGORIES: ScenePreset['category'][] = ['Urban', 'Township', 'Shopping', 'Nature'];

export const buildCampaignPrompt = (
  model: ModelPreset,
  scene: ScenePreset,
  aesthetic: Aesthetic,
  variationIndex: number,
): string => {
  const poses = [
    'standing confidently facing the camera, three-quarter angle',
    'walking toward the camera, mid-stride, candid motion',
    'leaning casually against a wall, looking off-camera',
    'editorial fashion pose, hand near face, strong eye contact',
  ];
  const pose = poses[variationIndex % poses.length];

  return [
    'A real photograph shot on a professional DSLR camera (Canon EOS R5, 85mm f/1.4 lens) for a high-end editorial fashion campaign.',
    `Subject: a REAL HUMAN FASHION MODEL — a ${model.bodyType} ${model.gender === 'non-binary' ? 'androgynous person' : model.gender === 'female' ? 'woman' : 'man'} of African / South African descent with ${model.skinTone} skin tone, ${AESTHETIC_LABELS[aesthetic].toLowerCase()} aesthetic. Real human skin with natural pores, fine hairs, subtle imperfections, realistic eye reflections, individual eyelashes, and natural facial asymmetry.`,
    `The model is wearing the EXACT garment shown in the reference image — preserve the garment's colour, cut, pattern, fabric texture and proportions faithfully. Do NOT redesign or restyle the garment.`,
    `Setting: ${scene.prompt}.`,
    `Pose: ${pose}.`,
    'Lighting: real on-location natural light with cinematic soft rim highlights, magazine-quality colour grading.',
    'Composition: full-body, vertical 3:4 fashion campaign framing, sharp focus on the model, shallow depth of field (bokeh background).',
    'Style: Vogue / Elle / Drum magazine editorial photography — indistinguishable from a real photograph.',
    'ABSOLUTE STRICT RULES: The model MUST look like a real human being photographed in real life — NOT a 3D render, NOT an avatar, NOT CGI, NOT MetaHuman, NOT Unreal Engine, NOT Pixar, NOT anime, NOT illustrated, NOT AI-looking, NOT plastic skin, NOT airbrushed. Skin must have authentic texture and real pores. Do NOT include any copyrighted brand names, store names, mall names, or logos. Do NOT add text, watermarks, or graphics. The garment must remain visually identical to the reference.',
  ].join(' ');
};
