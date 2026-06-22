import { useEffect, useMemo, useRef, useState } from 'react';

const profiles = [
  { id: 'eba', label: 'Эба', czechName: 'Eba', accent: 'bg-sky-500 border-sky-700' },
  { id: 'unuruu', label: 'Өнөрөө', czechName: 'Onoro', accent: 'bg-orange-500 border-orange-700' },
];

const lessons = [
  {
    text: 'Ahoj, jak se máš?',
    pronunciation: 'Ахой, як сэ мааш?',
    translation: 'Сайн уу, сонин сайхан юу байна?',
    tip: '2-р хичээл дээр үзсэн мэндчилгээний бүтцийг ашиглана уу.',
  },
  {
    text: 'Jmenuji se {name}.',
    pronunciation: 'Йменуйи сэ {name}.',
    translation: 'Намайг {label} гэдэг.',
    tip: 'Jmenuji se = намайг ... гэдэг гэсэн утгатай.',
  },
  {
    text: 'Děkuji, mám se dobře.',
    pronunciation: 'Декуйи, маам сэ добрже.',
    translation: 'Баярлалаа, би сайн байна.',
    tip: 'mám se dobře = би сайн байна.',
  },
];

const cleanWords = (value) =>
  value
    .toLocaleLowerCase('cs-CZ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

export default function App() {
  const [screen, setScreen] = useState('profiles');
  const [profile, setProfile] = useState(null);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [correctWordIndices, setCorrectWordIndices] = useState([]);
  const [isLessonCompleted, setIsLessonCompleted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState('');
  const recognitionRef = useRef(null);

  const currentLesson = useMemo(() => {
    const source = lessons[lessonIndex];
    if (!profile) return source;
    return {
      ...source,
      text: source.text.replaceAll('{name}', profile.czechName),
      pronunciation: source.pronunciation.replaceAll('{name}', profile.czechName),
      translation: source.translation.replaceAll('{label}', profile.label),
    };
  }, [lessonIndex, profile]);

  const targetWords = useMemo(() => cleanWords(currentLesson.text), [currentLesson.text]);

  useEffect(() => {
    if (correctWordIndices.length !== targetWords.length || targetWords.length === 0 || isLessonCompleted) return;

    setIsLessonCompleted(true);
    const timer = window.setTimeout(() => {
      setLessonIndex((index) => (index + 1) % lessons.length);
      setCorrectWordIndices([]);
      setIsLessonCompleted(false);
      setRecognitionError('');
      setIsListening(false);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [correctWordIndices, targetWords.length, isLessonCompleted]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    window.speechSynthesis?.cancel();
  }, []);

  function goToLesson(selectedProfile) {
    setProfile(selectedProfile);
    setLessonIndex(0);
    setCorrectWordIndices([]);
    setIsLessonCompleted(false);
    setRecognitionError('');
    setScreen('lesson');
  }

  function speakCzech() {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(currentLesson.text);
    utterance.lang = 'cs-CZ';
    utterance.rate = 0.82;
    window.speechSynthesis.speak(utterance);
  }

  function startRecognition() {
    if (isLessonCompleted) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      setRecognitionError('Энэ browser дуудлага таних функцийг дэмжихгүй байна.');
      return;
    }

    setRecognitionError('');
    setCorrectWordIndices([]);
    setIsListening(true);

    const recognition = new Recognition();
    recognition.lang = 'cs-CZ';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += ` ${event.results[i][0].transcript}`;
      }

      const spokenWords = cleanWords(transcript);
      setCorrectWordIndices((previous) => {
        const next = new Set(previous);
        spokenWords.forEach((spokenWord) => {
          const match = targetWords.findIndex((targetWord, index) => targetWord === spokenWord && !next.has(index));
          if (match !== -1) next.add(match);
        });
        return [...next].sort((a, b) => a - b);
      });
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setRecognitionError(event.error === 'not-allowed' ? 'Микрофоны зөвшөөрөл өгөөгүй байна.' : 'Дуу танигдсангүй. Дахин удаан хэлж үзээрэй.');
    };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
  }

  if (screen === 'profiles') {
    return (
      <main className="min-h-screen bg-[#131f24] px-5 py-8 text-white">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 grid h-24 w-24 place-items-center rounded-[2rem] border-b-4 border-[#37464f] bg-[#203038] text-5xl">◉</div>
            <p className="mb-2 text-xs font-extrabold tracking-[0.22em] text-[#58cc02]">ХУВИЙН СУРГАЛТ</p>
            <h1 className="text-3xl font-extrabold text-white">Хэн сурах вэ?</h1>
            <p className="mt-3 text-md font-medium text-[#afbbbf]">Суралцагчаа сонго. Ахиц тус тусдаа хадгалагдана.</p>
          </div>
          <div className="space-y-4">
            {profiles.map((item) => (
              <button key={item.id} onClick={() => goToLesson(item)} className="flex w-full items-center gap-4 rounded-2xl border-b-4 border-[#37464f] bg-[#203038] p-5 text-left transition-all active:translate-y-[2px] active:border-b-2">
                <span className={`grid h-14 w-14 place-items-center rounded-2xl border-b-4 text-xl font-extrabold text-white ${item.accent}`}>{item.label[0]}</span>
                <span className="flex-1"><span className="block text-xl font-extrabold">{item.label}</span><span className="mt-1 block text-sm font-medium text-[#afbbbf]">{item.czechName} · Чехээр сурах</span></span>
                <span className="text-3xl font-bold text-[#58cc02]">›</span>
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  const progress = Math.max(12, ((lessonIndex + 1) / 9) * 100);
  const sentenceParts = currentLesson.text.split(/(\s+)/);
  let wordCounter = 0;

  return (
    <main className="min-h-screen bg-[#131f24] px-5 py-6 text-white">
      <section className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-md flex-col">
        <header className="flex items-center gap-3">
          <button onClick={() => setScreen('profiles')} className="grid h-11 w-11 place-items-center rounded-full border-b-4 border-[#37464f] bg-[#203038] text-3xl leading-none text-[#afbbbf] active:translate-y-[2px] active:border-b-2">×</button>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-[#37464f]"><div className="h-full rounded-full bg-[#58cc02] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
          <span className="text-lg font-extrabold text-[#afbbbf]">{lessonIndex + 1}/9</span>
        </header>

        <div className="mt-5 flex items-center gap-3">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border-b-4 border-[#37464f] bg-[#203038] text-4xl">◉</div>
          <div className="rounded-2xl border-b-4 border-[#37464f] bg-[#203038] px-5 py-4 text-base font-bold leading-relaxed text-white">{currentLesson.tip}</div>
        </div>

        <section className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <p className="mb-3 text-sm font-bold text-[#58cc02]">{profile?.label} · Чехээр: {profile?.czechName}</p>
          <h1 className="text-3xl font-extrabold tracking-wide text-white sm:text-4xl">
            {sentenceParts.map((part, index) => {
              if (/^\s+$/.test(part)) return part;
              const currentIndex = wordCounter;
              wordCounter += 1;
              const isCorrect = correctWordIndices.includes(currentIndex);
              return <span key={`${part}-${index}`} className={isCorrect ? 'text-[#58cc02]' : undefined}>{part}</span>;
            })}
          </h1>
          <p className="mt-4 text-base font-bold text-[#afbbbf]">Дуудлага: {currentLesson.pronunciation}</p>
          <p className="mt-2 text-md font-medium text-[#afbbbf]">{currentLesson.translation}</p>

          <button onClick={speakCzech} className="mt-10 grid h-20 w-20 place-items-center rounded-full border-b-4 border-[#37464f] bg-[#203038] text-3xl active:translate-y-[2px] active:border-b-2">🔊</button>
          <span className="mt-3 text-sm font-bold text-[#afbbbf]">Дахин сонсох</span>
        </section>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <button className="rounded-2xl border-b-4 border-[#37464f] bg-[#203038] px-4 py-4 text-sm font-extrabold text-[#afbbbf] active:translate-y-[2px] active:border-b-2">🗂 Флэшкарт+</button>
          <button onClick={() => { setLessonIndex((i) => (i + 1) % lessons.length); setCorrectWordIndices([]); }} className="rounded-2xl border-b-4 border-[#37464f] bg-[#203038] px-4 py-4 text-sm font-extrabold text-[#afbbbf] active:translate-y-[2px] active:border-b-2">⏭ Алгасах</button>
        </div>

        {recognitionError && <p className="mb-4 text-center text-sm font-extrabold text-[#ff6b6b]">{recognitionError}</p>}
        <button onClick={startRecognition} disabled={isListening || isLessonCompleted} className={`rounded-2xl border-b-4 px-5 py-5 text-xl font-bold text-white transition-all active:translate-y-[2px] active:border-b-2 disabled:opacity-80 ${isLessonCompleted ? 'bg-[#58cc02] border-[#46a302]' : isListening ? 'bg-[#1b8790] border-[#16666d]' : 'bg-[#58cc02] border-[#46a302]'}`}>
          {isLessonCompleted ? '✓ Үргэлжлүүлэх' : isListening ? '🎙 Сонсож байна...' : '🎤 Дуудлага шалгах'}
        </button>
      </section>
    </main>
  );
}
