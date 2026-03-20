import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Youtube, 
  Sparkles, 
  Search, 
  Image as ImageIcon, 
  FileText, 
  MessageSquare, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Download, 
  Copy, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Moon, 
  Sun,
  Layout,
  Type as TypeIcon,
  Palette,
  ArrowRight,
  Loader2,
  Heart
} from 'lucide-react';
import { cn } from './lib/utils';
import { 
  generateChannelNames, 
  checkAvailability, 
  generateSEO, 
  generateLogo, 
  generateBanner, 
  chatAssistant,
  ChannelInput,
  NameSuggestion,
  SEOContent
} from './services/gemini';

// --- Types ---

type Step = 'input' | 'names' | 'assets' | 'seo' | 'chat';

interface SavedIdentity {
  id: string;
  name: string;
  niche: string;
  logo?: string;
  banner?: string;
  seo?: SEOContent;
}

// --- Components ---

const Card = ({ children, className, id }: { children: React.ReactNode, className?: string, id?: string }) => (
  <div id={id} className={cn("bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm", className)}>
    {children}
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  className, 
  disabled, 
  isLoading,
  id
}: { 
  children: React.ReactNode, 
  onClick?: () => void, 
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger',
  className?: string,
  disabled?: boolean,
  isLoading?: boolean,
  id?: string
}) => {
  const variants = {
    primary: "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:opacity-90",
    secondary: "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700",
    outline: "border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
    ghost: "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800",
    danger: "bg-red-500 text-white hover:bg-red-600"
  };

  return (
    <button 
      id={id}
      onClick={onClick}
      disabled={disabled || isLoading}
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : children}
    </button>
  );
};

const Input = ({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  type = 'text',
  id
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  placeholder?: string,
  type?: string,
  id?: string
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 ml-1">
      {label}
    </label>
    <input 
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 transition-all"
    />
  </div>
);

const Select = ({ 
  label, 
  value, 
  onChange, 
  options,
  id
}: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void, 
  options: string[],
  id?: string
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 ml-1">
      {label}
    </label>
    <select 
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 transition-all appearance-none"
    >
      {options.map(opt => (
        <option key={opt} value={opt.toLowerCase()}>{opt}</option>
      ))}
    </select>
  </div>
);

// --- Main App ---

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [step, setStep] = useState<Step>('input');
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [input, setInput] = useState<ChannelInput>({
    keywords: '',
    niche: '',
    tone: 'Professional',
    audience: ''
  });

  // Results State
  const [suggestions, setSuggestions] = useState<NameSuggestion[]>([]);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, any>>({});
  const [seoContent, setSeoContent] = useState<SEOContent | null>(null);
  const [logos, setLogos] = useState<string[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<{ role: string, parts: { text: string }[] }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Favorites
  const [favorites, setFavorites] = useState<SavedIdentity[]>([]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleGenerateNames = async () => {
    setIsLoading(true);
    try {
      const names = await generateChannelNames(input);
      setSuggestions(names);
      setStep('names');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckAvailability = async (name: string) => {
    if (availability[name]) return;
    setAvailability(prev => ({ ...prev, [name]: { loading: true } }));
    try {
      const status = await checkAvailability(name);
      setAvailability(prev => ({ ...prev, [name]: { ...status, loading: false } }));
    } catch (error) {
      setAvailability(prev => ({ ...prev, [name]: { loading: false, error: true } }));
    }
  };

  const handleSelectName = async (name: string) => {
    setSelectedName(name);
    setIsLoading(true);
    try {
      const seo = await generateSEO(name, input);
      setSeoContent(seo);
      setStep('assets');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAssets = async () => {
    if (!selectedName) return;
    setIsLoading(true);
    try {
      const [logo1, logo2, b] = await Promise.all([
        generateLogo(selectedName, input.niche, 'Modern'),
        generateLogo(selectedName, input.niche, 'Minimal'),
        generateBanner(selectedName, "The ultimate destination for " + input.niche, input.niche)
      ]);
      setLogos([logo1, logo2]);
      setBanner(b);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: 'user', parts: [{ text: chatInput }] };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    
    try {
      const response = await chatAssistant(chatMessages, chatInput);
      setChatMessages(prev => [...prev, { role: 'model', parts: [{ text: response || "" }] }]);
    } catch (error) {
      console.error(error);
    }
  };

  const saveToFavorites = () => {
    if (!selectedName) return;
    const newFav: SavedIdentity = {
      id: Date.now().toString(),
      name: selectedName,
      niche: input.niche,
      logo: logos[0],
      banner: banner || undefined,
      seo: seoContent || undefined
    };
    setFavorites(prev => [...prev, newFav]);
  };

  const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    link.click();
  };

  const downloadSEO = () => {
    if (!seoContent || !selectedName) return;
    const content = `
CHANNEL IDENTITY: ${selectedName}
NICHE: ${input.niche}
TONE: ${input.tone}

--- CHANNEL DESCRIPTION ---
${seoContent.description}

--- ABOUT SECTION ---
${seoContent.about}

--- KEYWORDS & TAGS ---
${seoContent.keywords.join(', ')}

--- HASHTAGS ---
${seoContent.hashtags.join(' ')}
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedName.replace(/\s+/g, '_')}_SEO_Strategy.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-black">
      
      {/* --- Navigation --- */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep('input')}>
            <div className="w-10 h-10 bg-zinc-900 dark:bg-zinc-100 rounded-xl flex items-center justify-center">
              <Youtube className="text-white dark:text-zinc-900 w-6 h-6" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">TubeIdentity<span className="text-zinc-500">AI</span></span>

          </div>
          
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <Button variant="outline" className="hidden sm:flex" onClick={() => setStep('chat')}>
              <MessageSquare className="w-4 h-4" />
              AI Assistant
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-12">
        
        {/* --- Progress Steps --- */}
        <div className="flex items-center justify-center mb-12 overflow-x-auto pb-4 sm:pb-0">
          {[
            { id: 'input', label: 'Details', icon: Layout },
            { id: 'names', label: 'Names', icon: TypeIcon },
            { id: 'assets', label: 'Branding', icon: Palette },
            { id: 'seo', label: 'SEO', icon: FileText }
          ].map((s, i) => (
            <React.Fragment key={s.id}>
              <div 
                className={cn(
                  "flex flex-col items-center gap-2 transition-all cursor-pointer min-w-[80px]",
                  step === s.id ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600"
                )}
                onClick={() => {
                  if (i === 0 || (i === 1 && suggestions.length > 0) || (i === 2 && selectedName) || (i === 3 && seoContent)) {
                    setStep(s.id as Step);
                  }
                }}
              >
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  step === s.id ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900" : "border-zinc-200 dark:border-zinc-800"
                )}>
                  <s.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold uppercase tracking-tighter">{s.label}</span>
              </div>
              {i < 3 && <div className="w-12 h-[2px] bg-zinc-200 dark:bg-zinc-800 mx-4 mb-6" />}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          
          {/* --- Step 1: Input --- */}
          {step === 'input' && (
            <motion.div 
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl mx-auto"
            >
              <div className="text-center mb-10">
                <h1 className="text-4xl font-display font-bold mb-3 tracking-tight">Start Your Journey</h1>
                <p className="text-zinc-500 dark:text-zinc-400">Tell us about your vision, and we'll craft the perfect identity.</p>
              </div>

              <Card className="p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <Input 
                    label="Niche" 
                    placeholder="e.g. Tech, Cooking, Gaming" 
                    value={input.niche} 
                    onChange={(v) => setInput({...input, niche: v})} 
                  />
                  <Select 
                    label="Tone" 
                    value={input.tone} 
                    onChange={(v) => setInput({...input, tone: v})} 
                    options={['Professional', 'Funny', 'Educational', 'Tech', 'Islamic', 'Luxury', 'Gaming']}
                  />
                </div>
                <Input 
                  label="Keywords" 
                  placeholder="e.g. review, tutorial, daily, master" 
                  value={input.keywords} 
                  onChange={(v) => setInput({...input, keywords: v})} 
                />
                <Input 
                  label="Target Audience" 
                  placeholder="e.g. young adults interested in coding" 
                  value={input.audience} 
                  onChange={(v) => setInput({...input, audience: v})} 
                />
                
                <Button 
                  className="w-full py-4 text-lg" 
                  onClick={handleGenerateNames}
                  isLoading={isLoading}
                  disabled={!input.niche || !input.keywords}
                >
                  Generate Identities <Sparkles className="w-5 h-5" />
                </Button>
              </Card>
            </motion.div>
          )}

          {/* --- Step 2: Names --- */}
          {step === 'names' && (
            <motion.div 
              key="names"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-bold tracking-tight">Name Suggestions</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Pick a name that resonates with your brand.</p>
                </div>
                <Button variant="outline" onClick={() => setStep('input')}>
                  <ChevronLeft className="w-4 h-4" /> Back
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suggestions.map((s, i) => (
                  <Card key={i} className="group hover:border-zinc-900 dark:hover:border-zinc-100 transition-all">
                    <div className="p-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <h3 className="text-xl font-bold">{s.name}</h3>
                        <div className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-bold uppercase tracking-widest">
                          SEO: {s.seoScore}
                        </div>
                      </div>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{s.reason}</p>
                      
                      <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Availability</span>
                          <Button 
                            variant="ghost" 
                            className="h-6 text-[10px] px-2" 
                            onClick={() => handleCheckAvailability(s.name)}
                            isLoading={availability[s.name]?.loading}
                          >
                            <Search className="w-3 h-3" /> Check
                          </Button>
                        </div>
                        
                        {availability[s.name] && !availability[s.name].loading && (
                          <div className="grid grid-cols-3 gap-2">
                            {['youtube', 'google', 'social'].map(cat => {
                              const status = availability[s.name][cat];
                              return (
                                <div key={cat} className="flex flex-col items-center gap-1">
                                  {status === 'available' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : 
                                   status === 'taken' ? <XCircle className="w-4 h-4 text-red-500" /> : 
                                   <AlertCircle className="w-4 h-4 text-amber-500" />}
                                  <span className="text-[8px] uppercase font-bold text-zinc-500">{cat}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <Button 
                        className="w-full" 
                        variant={selectedName === s.name ? 'primary' : 'outline'}
                        onClick={() => handleSelectName(s.name)}
                      >
                        Select Name <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {/* --- Step 3: Assets --- */}
          {step === 'assets' && (
            <motion.div 
              key="assets"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-bold tracking-tight">Visual Identity</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Generating logos and banners for <span className="text-zinc-900 dark:text-zinc-100 font-bold">"{selectedName}"</span></p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('names')}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button onClick={() => setStep('seo')}>
                    Next: SEO <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                  {/* Banner Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold flex items-center gap-2"><ImageIcon className="w-5 h-5" /> YouTube Banner</h3>
                      {banner && (
                        <Button variant="ghost" className="h-8" onClick={() => downloadImage(banner, `${selectedName}-banner.png`)}>
                          <Download className="w-4 h-4" /> Download
                        </Button>
                      )}
                    </div>
                    <Card className="aspect-[16/9] relative group">
                      {banner ? (
                        <img src={banner} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800/50">
                          <ImageIcon className="w-12 h-12 text-zinc-300 mb-4" />
                          <p className="text-sm text-zinc-500">No banner generated yet</p>
                        </div>
                      )}
                      {/* Safe Area Overlay */}
                      <div className="absolute inset-0 border-2 border-dashed border-white/20 pointer-events-none flex items-center justify-center">
                        <div className="w-[40%] h-[20%] border border-white/40 flex items-center justify-center">
                          <span className="text-[8px] text-white/40 uppercase font-bold">Safe Area</span>
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Logo Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold flex items-center gap-2"><Palette className="w-5 h-5" /> Logo Options</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                      {logos.map((logo, i) => (
                        <Card key={i} className="aspect-square relative group">
                          <img src={logo} alt={`Logo ${i}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <Button variant="secondary" className="h-8 w-8 p-0" onClick={() => downloadImage(logo, `${selectedName}-logo-${i}.png`)}>
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button variant="secondary" className="h-8 w-8 p-0" onClick={() => saveToFavorites()}>
                              <Heart className="w-4 h-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                      <button 
                        onClick={handleGenerateAssets}
                        disabled={isLoading}
                        className="aspect-square rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:border-zinc-900 dark:hover:border-zinc-100 transition-all"
                      >
                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                        <span className="text-xs font-bold uppercase">Generate</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <Card className="p-6 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                    <h4 className="font-bold mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Pro Tips</h4>
                    <ul className="space-y-4 text-sm opacity-80">
                      <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] shrink-0">1</div>
                        Keep your banner clean. The center is where the magic happens on mobile.
                      </li>
                      <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] shrink-0">2</div>
                        Logos should be simple enough to be recognizable as a small circle.
                      </li>
                      <li className="flex gap-3">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] shrink-0">3</div>
                        Consistent colors across logo and banner build trust.
                      </li>
                    </ul>
                  </Card>
                  
                  <Button className="w-full py-4" onClick={handleGenerateAssets} isLoading={isLoading}>
                    Regenerate All Assets
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* --- Step 4: SEO --- */}
          {step === 'seo' && (
            <motion.div 
              key="seo"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-display font-bold tracking-tight">SEO Optimization</h2>
                  <p className="text-zinc-500 dark:text-zinc-400">Ready-to-use content for your channel's metadata.</p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep('assets')}>
                    <ChevronLeft className="w-4 h-4" /> Back
                  </Button>
                  <Button variant="secondary" onClick={downloadSEO}>
                    <Download className="w-4 h-4" /> Download All
                  </Button>
                  <Button variant="primary" onClick={saveToFavorites}>
                    <Heart className="w-4 h-4" /> Save Identity
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold flex items-center gap-2"><FileText className="w-5 h-5" /> Channel Description</h3>
                      <Button variant="ghost" className="h-8" onClick={() => copyToClipboard(seoContent?.description || "")}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {seoContent?.description}
                    </p>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold flex items-center gap-2"><Layout className="w-5 h-5" /> About Section</h3>
                      <Button variant="ghost" className="h-8" onClick={() => copyToClipboard(seoContent?.about || "")}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">
                      {seoContent?.about}
                    </p>
                  </Card>
                </div>

                <div className="space-y-8">
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-5 h-5" /> Keywords & Tags</h3>
                      <Button variant="ghost" className="h-8" onClick={() => copyToClipboard(seoContent?.keywords.join(', ') || "")}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {seoContent?.keywords.map((k, i) => (
                        <span key={i} className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-full text-xs font-medium">
                          {k}
                        </span>
                      ))}
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold flex items-center gap-2"><Sparkles className="w-5 h-5" /> Trending Hashtags</h3>
                      <Button variant="ghost" className="h-8" onClick={() => copyToClipboard(seoContent?.hashtags.join(' ') || "")}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {seoContent?.hashtags.map((h, i) => (
                        <span key={i} className="text-zinc-900 dark:text-zinc-100 font-bold text-sm">
                          {h}
                        </span>
                      ))}
                    </div>
                  </Card>
                </div>
              </div>
            </motion.div>
          )}

          {/* --- Step 5: Chat --- */}
          {step === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto h-[70vh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-display font-bold tracking-tight flex items-center gap-3">
                  <MessageSquare className="w-8 h-8" /> AI Branding Assistant
                </h2>
                <Button variant="outline" onClick={() => setStep('input')}>
                  Close Chat
                </Button>
              </div>

              <Card className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
                      <MessageSquare className="w-12 h-12 opacity-20" />
                      <p>Ask me anything about your YouTube channel strategy!</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {["What content should I make?", "How to get more subscribers?", "Review my niche"].map(q => (
                          <button 
                            key={q} 
                            onClick={() => setChatInput(q)}
                            className="px-4 py-2 rounded-full border border-zinc-200 dark:border-zinc-800 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={cn(
                      "flex flex-col max-w-[80%]",
                      msg.role === 'user' ? "ml-auto items-end" : "items-start"
                    )}>
                      <div className={cn(
                        "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                        msg.role === 'user' 
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-none" 
                          : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none"
                      )}>
                        {msg.parts[0].text}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">
                        {msg.role === 'user' ? 'You' : 'Assistant'}
                      </span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex gap-3">
                  <input 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
                  />
                  <Button onClick={handleSendMessage}>
                    Send <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}

        </AnimatePresence>

        {/* --- Favorites Sidebar / Section --- */}
        {favorites.length > 0 && step !== 'chat' && (
          <div className="mt-24 pt-12 border-t border-zinc-200 dark:border-zinc-800">
            <h2 className="text-2xl font-bold mb-8 flex items-center gap-2"><Heart className="w-6 h-6 text-red-500" /> Saved Identities</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {favorites.map(fav => (
                <Card key={fav.id} className="group relative">
                  <div className="aspect-video bg-zinc-100 dark:bg-zinc-800">
                    {fav.banner && <img src={fav.banner} alt="Banner" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                  </div>
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden shrink-0">
                      {fav.logo && <img src={fav.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm truncate">{fav.name}</h4>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{fav.niche}</p>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" className="h-8 w-8 p-0" onClick={() => {
                      setSelectedName(fav.name);
                      setSeoContent(fav.seo || null);
                      setLogos(fav.logo ? [fav.logo] : []);
                      setBanner(fav.banner || null);
                      setStep('assets');
                    }}>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button variant="danger" className="h-8 w-8 p-0" onClick={() => setFavorites(prev => prev.filter(f => f.id !== fav.id))}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* --- Footer --- */}
      <footer className="mt-24 border-t border-zinc-200 dark:border-zinc-800 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2 opacity-50">
            <Youtube className="w-5 h-5" />
            <span className="font-bold text-sm tracking-tight">TubeIdentity AI © 2026</span>
          </div>
          <div className="flex gap-8 text-xs font-bold uppercase tracking-widest text-zinc-400">
            <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Terms</a>
            <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
