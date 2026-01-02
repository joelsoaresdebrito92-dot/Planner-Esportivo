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
    const saved = localStorage.getItem('bet_planner_data');
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(format(new Date(), 'yyyy-MM-dd'));
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('bet_planner_data', JSON.stringify(appData));
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
      setAiAnalysis("Falha na análise da IA.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleManualSave = () => {
    setSaveStatus('saving');
    localStorage.setItem('bet_planner_data', JSON.stringify(appData));
    
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  };

  const handleShare = () => {
    if (!selectedDayPlan) return;
    const activeGames = selectedDayPlan.games.filter(g => g.match);
    if (activeGames.length === 0) return alert("Adicione jogos para compartilhar!");

    const text = `📅 Planejamento - ${format(parseISO(selectedDayPlan.date), 'dd/MM')}\n\n` +
      activeGames.map(g => `⏰ ${g.time} | 🏆 ${g.league}\n⚽ ${g.match}\n`).join('\n') +
      `🚀 Boa sorte! #BetMaster`;
    
    navigator.clipboard.writeText(text);
    alert("Resumo copiado para a área de transferência!");
  };

  const exportData = () => {
    const dataStr = JSON.stringify(appData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `betmaster-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (typeof json === 'object') {
          setAppData(json);
          alert("Backup importado com sucesso!");
        }
      } catch (err) {
        alert("Erro ao importar arquivo. Certifique-se que é um JSON válido do BetMaster.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-[1600px] mx-auto flex flex-col gap-6 pb-32">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <Trophy className="text-sky-600 w-8 h-8 md:w-10 md:h-10 shrink-0" style={{ filter: 'drop-shadow(0 0 2px #0ea5e9)' }} />
            <h1 className="text-3xl md:text-4xl font-black text-black text-outline-blue tracking-tight">
              BetMaster Planner
            </h1>
          </div>
          <p className="text-sky-700 text-sm font-semibold flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Gestão Profissional de Apostas v1.0
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white shadow-sm border border-sky-200 p-1.5 rounded-2xl">
            <button 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2.5 hover:bg-sky-50 rounded-xl transition-all text-sky-800 active:scale-95"
            >
              <ChevronLeft size={22} />
            </button>
            <span className="font-bold min-w-[150px] text-center capitalize text-sky-950 text-lg">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button 
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2.5 hover:bg-sky-50 rounded-xl transition-all text-sky-800 active:scale-95"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white/80 p-1.5 rounded-2xl border border-sky-200 shadow-sm">
            <button 
              onClick={exportData}
              title="Exportar Backup"
              className="p-2.5 hover:bg-sky-50 text-sky-600 rounded-xl transition-all"
            >
              <Download size={20} />
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              title="Importar Backup"
              className="p-2.5 hover:bg-sky-50 text-sky-600 rounded-xl transition-all"
            >
              <Upload size={20} />
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
        {/* Calendário Principal */}
        <section className="lg:col-span-9 bg-[#020617] rounded-3xl overflow-hidden shadow-2xl border border-sky-500/30 flex flex-col">
          <div className="hidden md:grid grid-cols-7 border-b border-sky-500/20 bg-[#0f172a]/80">
            {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map(day => (
              <div key={day} className="py-4 text-center text-[10px] font-black text-sky-400/70 uppercase tracking-[0.2em]">
                {day}
              </div>
            ))}
          </div>

          {/* Desktop Grid */}
          <div className="hidden md:grid grid-cols-7 flex-1 min-h-[700px]">
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
                    relative p-4 text-left border-r border-b border-sky-500/10 transition-all flex flex-col group min-h-[140px]
                    ${isSelected ? 'bg-sky-500/10 ring-2 ring-inset ring-sky-400/40 z-10' : 'hover:bg-white/5'}
                    ${isOtherMonth ? 'opacity-20 grayscale bg-black/40' : ''}
                  `}
                >
                  <span className={`text-sm font-black mb-3 ${isToday ? 'text-white bg-sky-600 px-3 py-1 rounded-lg inline-block shadow-lg shadow-sky-500/40' : 'text-slate-500'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {games.length > 0 && (
                    <div className="mt-auto space-y-1.5 w-full">
                      {games.slice(0, 3).map((g, idx) => (
                        <div key={idx} className={`text-[10px] truncate border px-2 py-1 rounded-md font-bold w-full flex items-center justify-between ${g.status === 'win' ? 'bg-emerald-900/40 border-emerald-500/30 text-emerald-200' : g.status === 'loss' ? 'bg-red-900/40 border-red-500/30 text-red-200' : 'bg-sky-900/40 border-sky-400/20 text-sky-100'}`}>
                          <span className="truncate">{g.match}</span>
                          {g.time && <span className="opacity-60 ml-1 shrink-0">{g.time}</span>}
                        </div>
                      ))}
                      {games.length > 3 && (
                        <div className="text-[9px] text-sky-400/80 font-black text-center pt-1">+ {games.length - 3} EVENTOS</div>
                      )}
                    </div>
                  )}
                  {isSelected && <div className="absolute top-4 right-4 w-2 h-2 bg-sky-400 rounded-full shadow-[0_0_12px_#38bdf8]" />}
                </button>
              );
            })}
          </div>

          {/* Mobile List View */}
          <div className="md:hidden flex flex-col divide-y divide-sky-500/10 max-h-[60vh] overflow-y-auto custom-scrollbar bg-slate-950">
            {currentMonthDays.filter(day => format(day, 'MM') === format(currentDate, 'MM')).map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const isSelected = selectedDate === dayStr;
              const isToday = isDateToday(day);
              const dayData = appData[dayStr];
              const games = dayData?.games.filter(g => g.match) || [];

              return (
                <div
                  key={dayStr}
                  onClick={() => {
                    setSelectedDate(dayStr);
                    setAiAnalysis(null);
                  }}
                  className={`p-5 transition-all cursor-pointer ${isSelected ? 'bg-sky-500/10 border-l-4 border-sky-500 shadow-inner' : 'active:bg-white/5'}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black ${isToday ? 'bg-sky-600 text-white shadow-xl shadow-sky-900/60' : 'bg-slate-900 text-slate-500 border border-sky-500/20'}`}>
                        <span className="text-[10px] uppercase leading-none opacity-60 mb-1">{format(day, 'EEE', { locale: ptBR })}</span>
                        <span className="text-lg leading-none">{format(day, 'd')}</span>
                      </div>
                      <span className={`font-bold text-lg ${isSelected ? 'text-sky-400' : 'text-slate-300'}`}>
                        {isToday ? 'Hoje' : format(day, "EEEE", { locale: ptBR })}
                      </span>
                    </div>
                    {games.length > 0 && (
                      <span className="bg-sky-500/10 text-sky-400 text-[10px] font-black px-3 py-1.5 rounded-full border border-sky-500/30">
                        {games.length} {games.length === 1 ? 'JOGO' : 'JOGOS'}
                      </span>
                    )}
                  </div>

                  {games.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 ml-14">
                      {games.map((g, idx) => (
                        <div key={idx} className="flex items-center gap-4 bg-slate-900/80 border border-sky-500/10 p-3 rounded-xl">
                          <div className="flex items-center gap-2 min-w-[55px]">
                            <Clock size={14} className="text-sky-400" />
                            <span className="text-xs font-black text-sky-100">{g.time || '00:00'}</span>
                          </div>
                          <div className="flex-1 overflow-hidden">
                            <div className="text-[10px] text-sky-500/50 font-black uppercase truncate tracking-wider">{g.league}</div>
                            <div className="text-sm text-white font-bold truncate">{g.match}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Editor Lateral */}
        <aside className="lg:col-span-3 flex flex-col gap-6">
          <div className="bg-white rounded-3xl p-6 flex flex-col h-full sticky top-8 shadow-2xl border border-sky-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-black text-xl flex items-center gap-2 text-slate-900">
                  <CalendarIcon size={20} className="text-sky-600" />
                  {selectedDate ? format(parseISO(selectedDate), "dd 'de' MMMM", { locale: ptBR }) : 'Selecione'}
                </h2>
                <p className="text-sky-600/60 text-[10px] mt-1 font-black uppercase tracking-widest">Painel de Eventos</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handleShare} className="p-2.5 hover:bg-sky-50 rounded-xl text-sky-600 transition-all active:scale-90" title="Compartilhar">
                  <Share2 size={18} />
                </button>
                <button onClick={handleClearDay} className="p-2.5 hover:bg-red-50 rounded-xl text-slate-300 hover:text-red-500 transition-all active:scale-90" title="Limpar Dia">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-5 flex-1 overflow-y-auto custom-scrollbar pr-1 mb-6">
              {selectedDayPlan?.games.map((game, index) => (
                <div key={game.id} className="p-4 rounded-2xl bg-slate-950 border border-sky-500/20 group shadow-lg transition-all hover:border-sky-500/40">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black text-sky-400 bg-sky-950 px-3 py-1 rounded-full border border-sky-500/30"># JOGO {index + 1}</span>
                    <div className="flex gap-1.5">
                      <button 
                        onClick={() => handleUpdateGame(index, 'status', game.status === 'win' ? 'pending' : 'win')}
                        className={`p-1.5 rounded-lg transition-all border ${game.status === 'win' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-slate-900 text-slate-600 hover:text-emerald-500 border-sky-500/20'}`}
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button 
                        onClick={() => handleUpdateGame(index, 'status', game.status === 'loss' ? 'pending' : 'loss')}
                        className={`p-1.5 rounded-lg transition-all border ${game.status === 'loss' ? 'bg-red-500 text-white border-red-400' : 'bg-slate-900 text-slate-600 hover:text-red-500 border-sky-500/20'}`}
                      >
                        <XCircle size={18} />
                      </button>
                      <button 
                        onClick={() => handleRemoveGame(game.id)}
                        className="ml-1 p-1.5 text-slate-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                       <div className="space-y-1">
                        <label className="text-[9px] font-black text-sky-400/40 uppercase ml-1">Horário</label>
                        <input 
                          type="text" 
                          placeholder="Ex: 15:45"
                          value={game.time}
                          onChange={(e) => handleUpdateGame(index, 'time', e.target.value)}
                          className="w-full bg-slate-900 border border-sky-500/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500/60 text-white transition-all font-bold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-sky-400/40 uppercase ml-1">Liga</label>
                        <input 
                          type="text" 
                          placeholder="Camp"
                          value={game.league}
                          onChange={(e) => handleUpdateGame(index, 'league', e.target.value)}
                          className="w-full bg-slate-900 border border-sky-500/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500/60 text-white transition-all font-bold"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-sky-400/40 uppercase ml-1">Confronto</label>
                      <input 
                        type="text" 
                        placeholder="Time A vs Time B"
                        value={game.match}
                        onChange={(e) => handleUpdateGame(index, 'match', e.target.value)}
                        className="w-full bg-slate-900 border border-sky-500/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-sky-500/60 text-white transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button 
                onClick={handleAddGame}
                className="w-full py-4 border-2 border-dashed border-sky-200 rounded-2xl text-sky-400 hover:text-sky-600 hover:border-sky-400 hover:bg-sky-50 transition-all flex items-center justify-center gap-3 font-black text-xs group"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                ADICIONAR EVENTO
              </button>
            </div>

            <div className="mt-auto space-y-4 pt-6 border-t border-sky-100">
              {aiAnalysis && (
                <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2 mb-2 text-sky-700">
                    <Sparkles size={16} className="animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Análise BetMaster AI</span>
                  </div>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-medium italic">{aiAnalysis}</p>
                </div>
              )}
              
              <button 
                onClick={handleAiAnalyze}
                disabled={isAnalyzing || !selectedDayPlan?.games.some(g => g.match)}
                className="w-full bg-slate-950 hover:bg-black disabled:opacity-20 text-white text-xs font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-sky-900/10 border border-sky-500/30 active:scale-95 group"
              >
                {isAnalyzing ? (
                  <div className="w-5 h-5 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles size={18} className="text-sky-400 group-hover:scale-125 transition-transform" /> 
                    OBTER INSIGHTS IA
                  </>
                )}
              </button>
              
              <div className="flex items-center justify-center gap-4 pt-2">
                <a href="#" className="text-[9px] font-black text-slate-300 hover:text-sky-500 transition-colors uppercase flex items-center gap-1">
                  <Info size={10} /> Termos
                </a>
                <a href="#" className="text-[9px] font-black text-slate-300 hover:text-sky-500 transition-colors uppercase flex items-center gap-1">
                  <Settings size={10} /> Config
                </a>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Floating Save Button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full px-4 max-w-sm md:max-w-none md:w-auto">
        <button
          onClick={handleManualSave}
          disabled={saveStatus !== 'idle'}
          className={`
            w-full flex items-center justify-center gap-4 px-12 py-5 rounded-3xl font-black text-white shadow-2xl transition-all duration-300 transform active:scale-95 border-2 border-white/20 uppercase tracking-widest text-sm
            ${saveStatus === 'idle' ? 'bg-sky-600 hover:bg-sky-500' : saveStatus === 'saving' ? 'bg-slate-900 cursor-wait' : 'bg-emerald-600 shadow-emerald-500/40'}
          `}
        >
          {saveStatus === 'idle' ? (
            <><Save size={22} /> <span>Salvar Calendário</span></>
          ) : saveStatus === 'saving' ? (
            <><span>Sincronizando Dados...</span></>
          ) : (
            <><Check size={22} /> <span>Dados Protegidos!</span></>
          )}
        </button>
      </div>

      <footer className="mt-12 text-center text-slate-400 pb-12">
        <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-60">© 2024 BetMaster Planner Labs</p>
        <p className="text-[10px] italic">Aposte com responsabilidade. Este app é uma ferramenta de organização.</p>
      </footer>
    </div>
  );
};

export default App;