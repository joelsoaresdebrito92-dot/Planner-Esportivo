
import React, { useState, useEffect, useMemo } from 'react';
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
  Gamepad2,
  Save,
  Check,
  Plus
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

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-[1500px] mx-auto flex flex-col gap-6 pb-32">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-700 to-blue-800 bg-clip-text text-transparent flex items-center gap-2">
            <Trophy className="text-blue-700" /> BetMaster Planner
          </h1>
          <p className="text-sky-700 text-sm mt-1 font-medium">Sua estratégia em um só lugar.</p>
        </div>
        <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm shadow-sm border border-sky-200 p-2 rounded-xl">
          <button 
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            className="p-2 hover:bg-sky-100 rounded-lg transition-colors text-sky-800"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="font-bold min-w-[140px] text-center capitalize text-sky-900">
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button 
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            className="p-2 hover:bg-sky-100 rounded-lg transition-colors text-sky-800"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <section className="lg:col-span-9 bg-[#020617] rounded-2xl overflow-hidden shadow-2xl border border-sky-500/30 flex flex-col">
          <div className="hidden md:grid grid-cols-7 border-b border-sky-500/20 bg-[#0f172a]/50">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="py-3 text-center text-[10px] font-bold text-sky-400/70 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>

          <div className="hidden md:grid grid-cols-7">
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
                    relative min-h-[110px] md:min-h-[140px] p-3 text-left border-r border-b border-sky-500/10 transition-all flex flex-col group
                    ${isSelected ? 'bg-sky-500/10 ring-2 ring-inset ring-sky-400/40' : 'hover:bg-white/5'}
                    ${isOtherMonth ? 'opacity-30 bg-black/20' : ''}
                  `}
                >
                  <span className={`text-sm font-bold mb-2 ${isToday ? 'text-white bg-sky-600 px-2 py-0.5 rounded-md inline-block shadow-[0_0_10px_rgba(2,132,199,0.5)]' : 'text-slate-400'}`}>
                    {format(day, 'd')}
                  </span>
                  
                  {games.length > 0 && (
                    <div className="mt-auto space-y-1 w-full overflow-hidden">
                      {games.slice(0, 4).map((g, idx) => (
                        <div key={idx} className="text-[9px] md:text-[10px] truncate bg-sky-900/40 border border-sky-400/20 px-2 py-0.5 rounded text-sky-100 font-medium w-full">
                          {g.time && <span className="text-sky-400 font-bold mr-1">{g.time}</span>}
                          {g.match}
                        </div>
                      ))}
                      {games.length > 4 && (
                        <div className="text-[8px] text-sky-500 font-bold text-center">+{games.length - 4} mais</div>
                      )}
                    </div>
                  )}
                  {isSelected && <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-sky-400 rounded-full shadow-[0_0_15px_rgba(56,189,248,0.8)]" />}
                </button>
              );
            })}
          </div>

          <div className="md:hidden flex flex-col divide-y divide-sky-500/10 max-h-[60vh] overflow-y-auto custom-scrollbar">
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
                  className={`p-4 transition-all ${isSelected ? 'bg-sky-500/10 border-l-4 border-sky-500' : 'active:bg-white/5'}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold ${isToday ? 'bg-sky-600 text-white shadow-lg shadow-sky-900/40' : 'bg-slate-800 text-slate-400 border border-sky-500/20'}`}>
                        <span className="text-[10px] uppercase leading-none opacity-70 mb-0.5">{format(day, 'EEE', { locale: ptBR })}</span>
                        <span className="text-base leading-none">{format(day, 'd')}</span>
                      </div>
                      <span className={`font-semibold ${isSelected ? 'text-sky-400' : 'text-slate-300'}`}>
                        {isToday ? 'Hoje' : format(day, "EEEE", { locale: ptBR })}
                      </span>
                    </div>
                    {games.length > 0 && (
                      <span className="bg-sky-500/20 text-sky-400 text-[10px] font-bold px-2 py-1 rounded-full border border-sky-500/30">
                        {games.length} {games.length === 1 ? 'JOGO' : 'JOGOS'}
                      </span>
                    )}
                  </div>

                  {games.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2 ml-1">
                      {games.map((g, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-slate-900/60 border border-sky-500/10 p-2.5 rounded-lg">
                          <div className="flex items-center gap-1.5 min-w-[50px]">
                            <Clock size={12} className="text-sky-400" />
                            <span className="text-xs font-bold text-sky-100">{g.time || '--:--'}</span>
                          </div>
                          <div className="h-4 w-px bg-sky-500/20" />
                          <div className="flex-1 overflow-hidden">
                            <div className="text-[10px] text-sky-400/60 font-bold uppercase truncate">{g.league}</div>
                            <div className="text-sm text-white font-medium truncate">{g.match}</div>
                          </div>
                          {g.status !== 'pending' && (
                            <div className={g.status === 'win' ? 'text-emerald-400' : 'text-red-400'}>
                              {g.status === 'win' ? <CheckCircle size={16} /> : <XCircle size={16} />}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="ml-[52px] text-xs text-slate-400/50 italic">Nenhum jogo planejado</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 flex flex-col h-full sticky top-8 shadow-xl border border-sky-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2 text-sky-950">
                  <CalendarIcon size={18} className="text-sky-600" />
                  {selectedDate ? format(parseISO(selectedDate), "dd 'de' MMM", { locale: ptBR }) : 'Dia'}
                </h2>
                <p className="text-sky-700/60 text-[10px] mt-1 uppercase font-bold tracking-tighter">Editor Diário</p>
              </div>
              <div className="flex gap-1">
                <button onClick={handleShare} className="p-1.5 hover:bg-sky-100 rounded-lg text-sky-600 transition-colors">
                  <Share2 size={16} />
                </button>
                <button onClick={handleClearDay} className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-1 mb-4">
              {selectedDayPlan?.games.map((game, index) => (
                <div key={game.id} className="p-3 rounded-xl bg-[#020617] border border-sky-500/30 group shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[9px] font-bold text-sky-400 bg-sky-900/50 px-2 py-0.5 rounded-full uppercase border border-sky-500/20">Jogo {index + 1}</span>
                    <div className="flex gap-1 items-center">
                      <button 
                        onClick={() => handleUpdateGame(index, 'status', game.status === 'win' ? 'pending' : 'win')}
                        className={`p-1 rounded-md transition-colors border ${game.status === 'win' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-[#0f172a] text-slate-600 hover:text-emerald-500 border-sky-500/20'}`}
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button 
                        onClick={() => handleUpdateGame(index, 'status', game.status === 'loss' ? 'pending' : 'loss')}
                        className={`p-1 rounded-md transition-colors border ${game.status === 'loss' ? 'bg-red-500 text-white border-red-400' : 'bg-[#0f172a] text-slate-600 hover:text-red-500 border-sky-500/20'}`}
                      >
                        <XCircle size={16} />
                      </button>
                      <button 
                        onClick={() => handleRemoveGame(game.id)}
                        className="ml-1 p-1 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-2.5 mb-2.5">
                    <div className="grid grid-cols-2 gap-2">
                       <div>
                        <label className="text-[9px] font-bold text-sky-400/60 uppercase block mb-1 ml-1">Horário</label>
                        <input 
                          type="text" 
                          placeholder="00:00"
                          value={game.time}
                          onChange={(e) => handleUpdateGame(index, 'time', e.target.value)}
                          className="w-full bg-[#0f172a] border border-sky-500/20 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-sky-400 text-sky-50 transition-all"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-sky-400/60 uppercase block mb-1 ml-1">Liga</label>
                        <input 
                          type="text" 
                          placeholder="Camp"
                          value={game.league}
                          onChange={(e) => handleUpdateGame(index, 'league', e.target.value)}
                          className="w-full bg-[#0f172a] border border-sky-500/20 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-sky-400 text-sky-50 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-sky-400/60 uppercase block mb-1 ml-1">Confronto</label>
                      <input 
                        type="text" 
                        placeholder="Equipe A vs B"
                        value={game.match}
                        onChange={(e) => handleUpdateGame(index, 'match', e.target.value)}
                        className="w-full bg-[#0f172a] border border-sky-500/20 rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-sky-400 text-sky-50 transition-all"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <button 
                onClick={handleAddGame}
                className="w-full py-3 border-2 border-dashed border-sky-200 rounded-xl text-sky-400 hover:text-sky-600 hover:border-sky-400 hover:bg-sky-50 transition-all flex items-center justify-center gap-2 font-bold text-xs"
              >
                <Plus size={16} />
                Adicionar Novo Jogo
              </button>
            </div>

            <div className="mt-auto pt-4 border-t border-sky-100">
              {aiAnalysis ? (
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 mb-4">
                  <div className="flex items-center gap-2 mb-1.5 text-sky-700">
                    <Sparkles size={14} />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Insights IA</span>
                  </div>
                  <p className="text-[11px] text-sky-900 leading-relaxed italic">{aiAnalysis}</p>
                </div>
              ) : null}
              <button 
                onClick={handleAiAnalyze}
                disabled={isAnalyzing || !selectedDayPlan?.games.some(g => g.match)}
                className="w-full bg-[#020617] hover:bg-slate-900 disabled:opacity-20 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl group border border-sky-500/20"
              >
                {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Sparkles size={16} className="text-sky-400" /> Analisar com IA</>}
              </button>
            </div>
          </div>
        </aside>
      </main>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full px-4 max-w-xs md:max-w-none md:w-auto">
        <button
          onClick={handleManualSave}
          disabled={saveStatus !== 'idle'}
          className={`
            w-full flex items-center justify-center gap-3 px-10 py-4 rounded-full font-bold text-white shadow-2xl transition-all duration-300 transform active:scale-95 border-2 border-white/20
            ${saveStatus === 'idle' ? 'bg-sky-600 hover:bg-sky-500' : saveStatus === 'saving' ? 'bg-slate-800 cursor-wait' : 'bg-emerald-600'}
          `}
        >
          {saveStatus === 'idle' ? <><Save size={20} /> <span>Salvar Alterações</span></> : saveStatus === 'saving' ? <><span>Sincronizando...</span></> : <><Check size={20} /> <span>Sucesso!</span></>}
        </button>
      </div>
    </div>
  );
};

export default App;
