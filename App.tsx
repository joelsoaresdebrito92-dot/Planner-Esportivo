import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  parseISO,
  startOfWeek,
  endOfWeek,
  isToday as isDateToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronLeft, 
  ChevronRight, 
  Trophy, 
  Clock, 
  Sparkles, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Share2,
  Calendar as CalendarIcon,
  Save,
  Check,
  Plus,
  Download,
  Upload,
  Settings,
  Info
} from 'lucide-react';
import { AppData, DayPlan, GameEntry } from './types';
import { analyzeDayPicks } from './services/geminiService';

const STORAGE_KEY = 'bet_planner_pro_data';

const createNewGame = (): GameEntry => ({
  id: crypto.randomUUID(),
  time: '',
  league: '',
  match: '',
  status: 'pending'
});

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appData, setAppData] = useState<AppData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn("Falha ao carregar dados do LocalStorage", e);
      return {};
    }
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save robusto
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
      } catch (e) {
        console.error("Erro ao salvar no LocalStorage (provavelmente cheio)", e);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [appData]);

  const currentMonthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const selectedDayPlan = useMemo(() => {
    if (!selectedDate) return null;
    return appData[selectedDate] || {
      date: selectedDate,
      games: [createNewGame()]
    };
  }, [selectedDate, appData]);

  const handleUpdateGame = (index: number, field: keyof GameEntry, value: string) => {
    if (!selectedDate) return;
    
    const currentPlan = selectedDayPlan || {
      date: selectedDate,
      games: [createNewGame()]
    };

    const newGames = [...currentPlan.games];
    newGames[index] = { ...newGames[index], [field]: value } as any;
    
    const newPlan: DayPlan = { ...currentPlan, games: newGames };
    
    setAppData(prev => ({
      ...prev,
      [selectedDate]: newPlan
    }));
  };

  const handleAddGame = () => {
    if (!selectedDate) return;
    const currentPlan = selectedDayPlan || { date: selectedDate, games: [] };
    const newPlan: DayPlan = {
      ...currentPlan,
      games: [...currentPlan.games, createNewGame()]
    };
    setAppData(prev => ({ ...prev, [selectedDate]: newPlan }));
  };

  const handleRemoveGame = (id: string) => {
    if (!selectedDate || !selectedDayPlan) return;
    const newGames = selectedDayPlan.games.filter(g => g.id !== id);
    const finalGames = newGames.length === 0 ? [createNewGame()] : newGames;
    
    setAppData(prev => ({
      ...prev,
      [selectedDate]: { ...selectedDayPlan, games: finalGames }
    }));
  };

  const handleClearDay = () => {
    if (!selectedDate) return;
    if (window.confirm("Limpar todos os jogos deste dia?")) {
      const newPlan: DayPlan = {
        date: selectedDate,
        games: [createNewGame()]
      };
      setAppData(prev => ({ ...prev, [selectedDate]: newPlan }));
      setAiAnalysis(null);
    }
  };

  const handleAiAnalyze = async () => {
    if (!selectedDayPlan) return;
    setIsAnalyzing(true);
    setAiAnalysis(null);
    try {
      const result = await analyzeDayPicks(selectedDayPlan);
      setAiAnalysis(result);
    } catch (err) {
      setAiAnalysis("Falha na análise. Verifique sua conexão.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSave = () => {
    setSaveStatus('saving');
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
      setTimeout(() => {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      }, 600);
    } catch (e) {
      alert("Erro ao salvar: Espaço em disco insuficiente.");
      setSaveStatus('idle');
    }
  };

  const handleShare = () => {
    if (!selectedDayPlan) return;
    const activeGames = selectedDayPlan.games.filter(g => g.match);
    if (activeGames.length === 0) return alert("Adicione jogos primeiro!");

    const text = `🏆 *BetMaster Planner* - ${format(parseISO(selectedDayPlan.date), 'dd/MM/yyyy')}\n\n` +
      activeGames.map(g => `⏰ ${g.time || 'A def.'} | ${g.league}\n⚽ ${g.match}\n`).join('\n') +
      `🚀 Boa sorte!`;
    
    navigator.clipboard.writeText(text).then(() => {
      alert("Resumo profissional copiado para o WhatsApp!");
    });
  };

  // FUNÇÃO DE EXPORTAÇÃO CORRIGIDA (USANDO BLOB API)
  const exportData = () => {
    try {
      const dataStr = JSON.stringify(appData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const filename = `betmaster-backup-${format(new Date(), 'yyyyMMdd-HHmm')}.json`;
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Limpeza necessária para evitar vazamento de memória
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 0);
    } catch (e) {
      console.error("Erro na exportação", e);
      alert("Falha ao gerar arquivo de exportação.");
    }
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json && typeof json === 'object') {
          setAppData(json);
          alert("Backup restaurado com sucesso!");
        }
      } catch (err) {
        alert("Arquivo de backup inválido.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-[1600px] mx-auto flex flex-col gap-6 pb-32">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <Trophy className="text-sky-600 w-8 h-8 md:w-10 md:h-10 shrink-0" />
            <h1 className="text-3xl md:text-4xl font-black text-black text-outline-blue tracking-tight">
              BetMaster Planner
            </h1>
          </div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2 ml-1">
            Gestão Profissional e Inteligência de Dados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 bg-white shadow-sm border border-slate-200 p-1.5 rounded-2xl">
            <button 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-600 active:scale-90"
            >
              <ChevronLeft size={22} />
            </button>
            <span className="font-bold min-w-[150px] text-center capitalize text-slate-900 text-lg">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button 
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-600 active:scale-90"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={exportData}
              title="Exportar Backup JSON"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <Download size={18} /> <span className="hidden sm:inline">Exportar</span>
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              title="Importar Backup JSON"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <Upload size={18} /> <span className="hidden sm:inline">Importar</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={importData} 
              accept=".json" 
              className="hidden" 
            />
          </div>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Calendário */}
        <section className="lg:col-span-9 bg-[#0f172a] rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
          <div className="hidden md:grid grid-cols-7 border-b border-slate-800 bg-slate-900/50">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="py-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                {day}
              </div>
            ))}
          </div>

          <div className="hidden md:grid grid-cols-7 flex-1 min-h-[650px]">
            {currentMonthDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isSelected = selectedDate === dayStr;
              const isToday = isSameDay(day, new Date());
              const dayData = appData[dayStr];
              const games = dayData?.games.filter(g => g.match !== '') || [];
              const isOtherMonth = format(day, 'MM') !== format(currentDate, 'MM');

              return (
                <button
                  key={dayStr}
                  onClick={() => {
                    setSelectedDate(dayStr);
                    setAiAnalysis(null);
                  }}
                  className={`
                    relative p-5 text-left border-r border-b border-slate-800/50 transition-all flex flex-col group
                    ${isSelected ? 'bg-sky-500/10 ring-2 ring-inset ring-sky-500/40 z-10' : 'hover:bg-white/5'}
                    ${isOtherMonth ? 'opacity-20' : ''}
                  `}
                >
                  <span className={`text-sm font-black mb-3 ${isToday ? 'text-white bg-sky-600 px-3 py-1 rounded-lg inline-block' : 'text-slate-500'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {games.length > 0 && (
                    <div className="mt-auto space-y-1.5 w-full">
                      {games.slice(0, 3).map((g, idx) => (
                        <div key={idx} className={`text-[10px] truncate border px-2 py-1 rounded-md font-bold w-full ${g.status === 'win' ? 'bg-emerald-900/40 border-emerald-500/30 text-emerald-400' : g.status === 'loss' ? 'bg-red-900/40 border-red-500/30 text-red-400' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                          {g.match}
                        </div>
                      ))}
                      {games.length > 3 && (
                        <div className="text-[9px] text-sky-400 font-black text-center pt-1">+ {games.length - 3} MAIS</div>
                      )}
                    </div>
                  )}
                  {isSelected && <div className="absolute top-5 right-5 w-2 h-2 bg-sky-500 rounded-full shadow-[0_0_10px_#0ea5e9]" />}
                </button>
              );
            })}
          </div>

          {/* Mobile View */}
          <div className="md:hidden flex flex-col divide-y divide-slate-800 max-h-[60vh] overflow-y-auto bg-slate-900">
            {currentMonthDays.filter(day => format(day, 'MM') === format(currentDate, 'MM')).map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isSelected = selectedDate === dayStr;
              const isToday = isDateToday(day);
              const games = appData[dayStr]?.games.filter(g => g.match) || [];

              return (
                <div
                  key={dayStr}
                  onClick={() => setSelectedDate(dayStr)}
                  className={`p-5 transition-all ${isSelected ? 'bg-sky-500/10' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black ${isToday ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                      <span className="text-[10px] uppercase opacity-60">{format(day, 'EEE', { locale: ptBR })}</span>
                      <span className="text-lg">{format(day, 'd')}</span>
                    </div>
                    <div>
                      <span className={`font-bold block ${isSelected ? 'text-sky-400' : 'text-slate-300'}`}>
                        {format(day, "EEEE", { locale: ptBR })}
                      </span>
                      {games.length > 0 && <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{games.length} Jogos</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Painel Lateral */}
        <aside className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white rounded-[2.5rem] p-8 flex flex-col h-full sticky top-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="font-black text-2xl text-slate-900 flex items-center gap-2">
                  <CalendarIcon size={24} className="text-sky-600" />
                  {selectedDate ? format(parseISO(selectedDate), "dd/MM", { locale: ptBR }) : 'Pauta'}
                </h2>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Planejador Diário</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleShare} className="p-2 hover:bg-slate-50 rounded-xl text-sky-600 transition-all">
                  <Share2 size={20} />
                </button>
                <button onClick={handleClearDay} className="p-2 hover:bg-red-50 rounded-xl text-slate-300 hover:text-red-500 transition-all">
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2 mb-8">
              {selectedDayPlan?.games.map((game, index) => (
                <div key={game.id} className="p-5 rounded-3xl bg-slate-950 border border-slate-800 shadow-xl group transition-all hover:border-sky-500/30">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-[10px] font-black text-sky-400 bg-sky-900/40 px-3 py-1 rounded-full">JOGO #{index + 1}</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleUpdateGame(index, 'status', game.status === 'win' ? 'pending' : 'win')}
                        className={`p-1.5 rounded-lg border ${game.status === 'win' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-emerald-500'}`}
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button 
                        onClick={() => handleUpdateGame(index, 'status', game.status === 'loss' ? 'pending' : 'loss')}
                        className={`p-1.5 rounded-lg border ${game.status === 'loss' ? 'bg-red-600 border-red-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-red-500'}`}
                      >
                        <XCircle size={18} />
                      </button>
                      <button onClick={() => handleRemoveGame(game.id)} className="p-1.5 text-slate-700 hover:text-red-400">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Horário</label>
                        <input 
                          type="text" 
                          placeholder="12:00"
                          value={game.time}
                          onChange={(e) => handleUpdateGame(index, 'time', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Liga</label>
                        <input 
                          type="text" 
                          placeholder="Camp."
                          value={game.league}
                          onChange={(e) => handleUpdateGame(index, 'league', e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Confronto</label>
                      <input 
                        type="text" 
                        placeholder="Time A vs Time B"
                        value={game.match}
                        onChange={(e) => handleUpdateGame(index, 'match', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button 
                onClick={handleAddGame}
                className="w-full py-5 border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400 hover:text-sky-500 hover:border-sky-200 hover:bg-sky-50 transition-all flex items-center justify-center gap-3 font-black text-xs group"
              >
                <Plus size={24} className="group-hover:rotate-90 transition-transform" />
                ADICIONAR NOVO JOGO
              </button>
            </div>

            <div className="mt-auto space-y-4">
              {aiAnalysis && (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 mb-2 text-sky-600">
                    <Sparkles size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Insights BetMaster AI</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium italic">{aiAnalysis}</p>
                </div>
              )}
              
              <button 
                onClick={handleAiAnalyze}
                disabled={isAnalyzing || !selectedDayPlan?.games.some(g => g.match)}
                className="w-full bg-slate-950 text-white font-black py-5 rounded-3xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 disabled:opacity-20 group border border-slate-800"
              >
                {isAnalyzing ? <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" /> : <><Sparkles size={20} className="text-sky-400 group-hover:scale-125 transition-transform" /> ANALISAR COM IA</>}
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* Botão Flutuante Salvar */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 w-full px-4 max-w-sm md:max-w-none md:w-auto">
        <button
          onClick={handleManualSave}
          disabled={saveStatus !== 'idle'}
          className={`
            w-full flex items-center justify-center gap-4 px-16 py-6 rounded-[2.5rem] font-black text-white shadow-3xl transition-all duration-300 transform active:scale-95 border-2 border-white/10 uppercase tracking-[0.2em] text-sm
            ${saveStatus === 'idle' ? 'bg-sky-600 hover:bg-sky-500 hover:shadow-sky-500/40' : saveStatus === 'saving' ? 'bg-slate-900 cursor-wait' : 'bg-emerald-600 shadow-emerald-500/40'}
          `}
        >
          {saveStatus === 'idle' ? (
            <><Save size={24} /> <span>Salvar Planner</span></>
          ) : saveStatus === 'saving' ? (
            <span>Sincronizando...</span>
          ) : (
            <><Check size={24} /> <span>Salvo!</span></>
          )}
        </button>
      </div>

      <footer className="mt-16 text-center text-slate-400 pb-16">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-50">BetMaster Planner Pro — Enterprise Grade</p>
        <div className="flex items-center justify-center gap-6 opacity-40">
           <Info size={14} /> <Settings size={14} /> <Share2 size={14} />
        </div>
      </footer>
    </div>
  );
};

export default App;