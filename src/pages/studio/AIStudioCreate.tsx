import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrandOwner } from '@/hooks/useBrandOwner';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import StudioNav from '@/components/studio/StudioNav';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import GarmentUploader from '@/components/studio/GarmentUploader';
import ModelPresetPicker from '@/components/studio/ModelPresetPicker';
import ScenePresetPicker from '@/components/studio/ScenePresetPicker';
import CampaignResultsGrid from '@/components/studio/CampaignResultsGrid';
import { ModelPreset, ScenePreset, Aesthetic, buildCampaignPrompt, MODEL_PRESETS } from '@/lib/studioPresets';

const STEPS = ['Upload', 'Model', 'Scene', 'Generate'];

const AIStudioCreate = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { brands, loading: ownerLoading, isAdmin } = useBrandOwner();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [garment, setGarment] = useState<string | null>(null);
  const [model, setModel] = useState<ModelPreset | null>(MODEL_PRESETS[0]);
  const [aesthetic, setAesthetic] = useState<Aesthetic>('streetwear');
  const [scene, setScene] = useState<ScenePreset | null>(null);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<{ url: string; index: number }[]>([]);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth?next=/brand/studio/create');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const check = async () => {
      if (!brands.length) { setEnabled(false); return; }
      const bId = selectedBrandId || brands[0].id;
      if (!selectedBrandId) setSelectedBrandId(bId);
      const { data } = await supabase.from('brands').select('ai_studio_enabled').eq('id', bId).maybeSingle();
      setEnabled(!!(data as any)?.ai_studio_enabled || isAdmin);
    };
    if (!ownerLoading) check();
  }, [brands, ownerLoading, selectedBrandId, isAdmin]);

  if (authLoading || ownerLoading || enabled === null) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!enabled) {
    navigate('/brand/studio');
    return null;
  }

  const brand = brands[0];

  const canNext = () => {
    if (step === 0) return !!garment;
    if (step === 1) return !!model;
    if (step === 2) return !!scene;
    return true;
  };

  const generate = async () => {
    if (!garment || !model || !scene || !brand) return;
    setGenerating(true);
    setResults([]);
    try {
      const prompts = [0, 1, 2, 3].map((i) => buildCampaignPrompt(model, scene, aesthetic, i));
      const { data, error } = await supabase.functions.invoke('generate-ai-campaign', {
        body: {
          brand_id: brand.id,
          name: name || `${scene.label} · ${model.label}`,
          garment_image_url: garment,
          model_preset: model,
          scene_preset: scene.id,
          scene_prompt: scene.prompt,
          aesthetic,
          prompts,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const imgs = ((data as any)?.images ?? []) as { url: string; index: number }[];
      if (!imgs.length) throw new Error('No images returned');
      setResults(imgs);
      toast.success('Campaign generated');
    } catch (e: any) {
      toast.error(e.message || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header />
      <StudioNav />
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-5">
        {/* Stepper */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                i <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>{i + 1}</div>
              <span className={`text-xs hidden sm:inline ${i === step ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <Card className="p-5 md:p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">Upload your clothing</h2>
                <p className="text-xs text-muted-foreground">PNG, JPG. Transparent backgrounds give the best results.</p>
              </div>
              <Input placeholder="Campaign name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="max-w-sm" />
              <GarmentUploader userId={user!.id} brandId={brand.id} value={garment} onChange={setGarment} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">Choose your AI model</h2>
                <p className="text-xs text-muted-foreground">Pick a body type, skin tone and aesthetic.</p>
              </div>
              <ModelPresetPicker value={model} onChange={setModel} aesthetic={aesthetic} onAestheticChange={setAesthetic} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold">Choose your South African scene</h2>
                <p className="text-xs text-muted-foreground">All scenes are inspired by real SA locations — no copyrighted names.</p>
              </div>
              <ScenePresetPicker value={scene} onChange={setScene} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" /> Generate campaign</h2>
                <p className="text-xs text-muted-foreground">We will create 4 cinematic variations using your garment.</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="p-2 rounded-lg bg-muted/40"><p className="text-muted-foreground">Garment</p><p className="font-medium truncate">Uploaded ✓</p></div>
                <div className="p-2 rounded-lg bg-muted/40"><p className="text-muted-foreground">Model</p><p className="font-medium truncate">{model?.label}</p></div>
                <div className="p-2 rounded-lg bg-muted/40"><p className="text-muted-foreground">Scene</p><p className="font-medium truncate">{scene?.label}</p></div>
                <div className="p-2 rounded-lg bg-muted/40"><p className="text-muted-foreground">Aesthetic</p><p className="font-medium capitalize">{aesthetic.replace('-', ' ')}</p></div>
              </div>

              {!results.length ? (
                <Button
                  size="lg"
                  disabled={generating}
                  onClick={generate}
                  className="w-full bg-gradient-to-r from-primary to-secondary text-primary-foreground gap-2"
                >
                  {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating 4 variations…</> : <>Generate campaign <Sparkles className="w-4 h-4" /></>}
                </Button>
              ) : (
                <>
                  <CampaignResultsGrid images={results} watermark />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => { setResults([]); }}>Regenerate</Button>
                    <Button onClick={() => navigate('/brand/studio/campaigns')}>View all campaigns</Button>
                  </div>
                </>
              )}
            </div>
          )}
        </Card>

        {/* Step nav */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => (step === 0 ? navigate('/brand/studio') : setStep(step - 1))}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          {step < STEPS.length - 1 && (
            <Button onClick={() => setStep(step + 1)} disabled={!canNext()}>
              Next <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIStudioCreate;
