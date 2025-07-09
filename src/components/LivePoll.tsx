import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePoll } from '../context/PollContext';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { PlusCircle, Send, Check, X, Triangle, Square, Circle, Diamond } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF69B4'];

const POLL_OPTIONS_THEME = [
  { color: '#FF4560', icon: Triangle }, // Red
  { color: '#1E90FF', icon: Diamond }, // Blue
  { color: '#FFD700', icon: Circle }, // Gold
  { color: '#32CD32', icon: Square }, // Green
  { color: '#8A2BE2', icon: PlusCircle }, // Purple (fallback)
  { color: '#FF69B4', icon: Send }, // Pink (fallback)
];

const LivePoll = () => {
  const { id: classId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { activePoll, setActivePoll } = usePoll();
  const [voted, setVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  // Teacher-specific state
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null);

  const fetchActivePoll = useCallback(async () => {
    if (classId) {
      try {
        const res = await axios.get(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/polls/active/${classId}`);
        if (res.data) {
          setActivePoll(res.data);
          if (user && user.id && res.data.votedUsers.includes(user.id)) {
            setVoted(true);
          } else {
            setVoted(false);
          }
        } else {
          setActivePoll(null);
          setVoted(false);
        }
      } catch (err) {
        console.error('Error fetching active poll:', err);
        setActivePoll(null);
        setVoted(false);
      }
    }
  }, [classId, setActivePoll, user]);

  useEffect(() => {
    fetchActivePoll();
    const interval = setInterval(fetchActivePoll, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [fetchActivePoll]);

  useEffect(() => {
    if (activePoll && user && user.id && activePoll.votedUsers.includes(user.id)) {
      setVoted(true);
    } else {
      setVoted(false);
    }
  }, [activePoll, user]);

  const handleCreatePoll = async () => {
    if (question && options.every(o => o) && correctAnswer !== null && classId) {
      try {
        const res = await axios.post(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/polls`, {
          classId,
          question,
          options,
          correctAnswer,
        });
        setActivePoll(res.data);
        setQuestion('');
        setOptions(['', '']);
        setCorrectAnswer(null);
      } catch (err) {
        console.error('Error creating poll:', err);
        alert(err.response?.data?.msg || 'Failed to create poll.');
      }
    } else {
      alert('Please fill in all poll details and select a correct answer.');
    }
  };

  const handleVote = async (optionIndex: number) => {
    if (!voted && activePoll && user && user.id) {
      try {
        const res = await axios.post(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/polls/vote`, {
          pollId: activePoll.id,
          optionIndex,
        });
        setActivePoll(res.data);
        setVoted(true);
        setSelectedOption(optionIndex);
      } catch (err) {
        console.error('Error voting on poll:', err);
        alert(err.response?.data?.msg || 'Failed to vote on poll.');
      }
    }
  };

  const handleEndPoll = async () => {
    if (activePoll) {
      try {
        const res = await axios.put(`https://asia-south1-lessonloop-633d9.cloudfunctions.net/api/polls/end/${activePoll.id}`);
        setActivePoll(res.data);
      } catch (err) {
        console.error('Error ending poll:', err);
        alert(err.response?.data?.msg || 'Failed to end poll.');
      }
    }
  };

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const chartData = useMemo(() => {
    return activePoll?.options.map(option => ({ name: option.text, votes: option.votes }));
  }, [activePoll]);

  if (user?.role === 'Teacher') {
    return (
      <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
        {!activePoll ? (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Create a New Poll</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Poll Question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3"
              />
              {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                    style={{ backgroundColor: POLL_OPTIONS_THEME[index]?.color || '#ccc' }}
                  >
                    {POLL_OPTIONS_THEME[index]?.icon && React.createElement(POLL_OPTIONS_THEME[index].icon, { className: "w-5 h-5" })}
                  </div>
                  <input
                    type="text"
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    className="flex-1 border border-slate-300 rounded-lg p-3"
                  />
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="correctAnswer"
                      checked={correctAnswer === index}
                      onChange={() => setCorrectAnswer(index)}
                      className="form-radio h-5 w-5 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">Correct</span>
                  </label>
                </div>
              ))}
              <button onClick={handleAddOption} className="text-sm text-blue-600 flex items-center mt-2"><PlusCircle className="w-4 h-4 mr-1"/>Add Option</button>
              <button onClick={handleCreatePoll} className="w-full bg-blue-600 text-white p-3 rounded-lg font-semibold flex items-center justify-center"><Send className="w-5 h-5 mr-2"/>Launch Poll</button>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">{activePoll.question}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" tick={false} />
                <YAxis allowDecimals={false} hide />
                <Tooltip formatter={(value: number) => [`${value} votes`, 'Option']} />
                <Bar dataKey="votes" barSize={80}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={POLL_OPTIONS_THEME[index]?.color || '#ccc'}
                    />
                  ))}
                  <LabelList
                    dataKey="votes"
                    position="top"
                    content={(props: any) => {
                      const { x, y, width, value, index: dataIndex } = props;
                      const Icon = POLL_OPTIONS_THEME[dataIndex]?.icon;
                      const isCorrect = dataIndex === activePoll.correctAnswer;
                      return (
                        <g>
                          {isCorrect && Icon && (
                            <g transform={`translate(${x + width / 2 - 12}, ${y - 30})`}>
                              <Icon size={24} color="#FFFFFF" />
                            </g>
                          )}
                          <text x={x + width / 2} y={y - 10} fill="#FFFFFF" textAnchor="middle" dominantBaseline="middle">
                            {value}
                          </text>
                        </g>
                      );
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-4">
              {activePoll.options.map((option, index) => (
                <div key={index} className="flex items-center p-2 rounded-lg"
                  style={{ backgroundColor: POLL_OPTIONS_THEME[index]?.color || '#ccc' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white mr-2">
                    {POLL_OPTIONS_THEME[index]?.icon && React.createElement(POLL_OPTIONS_THEME[index].icon, { className: "w-5 h-5" })}
                  </div>
                  <span className="text-white font-semibold text-lg">{option.text}</span>
                  {index === activePoll.correctAnswer && <Check className="w-6 h-6 text-white ml-auto" />}
                </div>
              ))}
            </div>
            {activePoll.isActive ? (
              <button onClick={handleEndPoll} className="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg font-semibold mt-4">End Poll</button>
            ) : (
              <button onClick={() => {
                setActivePoll(null);
                setQuestion('');
                setOptions(['', '']);
                setCorrectAnswer(null);
              }} className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg font-semibold mt-4">Create New Poll</button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Student View
  return (
    <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
      {!activePoll || !activePoll.isActive ? (
        <p className="text-slate-600">Waiting for the teacher to start a poll...</p>
      ) : (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-4">{activePoll.question}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activePoll.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleVote(index)}
                disabled={voted}
                className={`relative w-full h-32 flex flex-col items-center justify-center p-4 rounded-lg text-white font-bold text-xl transition-all duration-300 ease-in-out transform 
                  ${voted && index === activePoll.correctAnswer ? 'ring-4 ring-green-500' : ''}
                  ${voted && index === selectedOption && index !== activePoll.correctAnswer ? 'ring-4 ring-red-500' : ''}
                  ${voted && index !== selectedOption && index !== activePoll.correctAnswer ? 'opacity-50' : ''}
                  ${!voted ? 'hover:scale-105 active:scale-95' : 'cursor-not-allowed'}
                `}
                style={{ backgroundColor: POLL_OPTIONS_THEME[index]?.color || '#ccc' }}
              >
                <div className="absolute top-2 left-2 w-8 h-8 rounded-full flex items-center justify-center text-white">
                  {POLL_OPTIONS_THEME[index]?.icon && React.createElement(POLL_OPTIONS_THEME[index].icon, { className: "w-5 h-5" })}
                </div>
                <span className="text-center">{option.text}</span>
                {voted && index === activePoll.correctAnswer && <Check className="absolute bottom-2 right-2 w-8 h-8 text-white" />}
                {voted && index === selectedOption && index !== activePoll.correctAnswer && <X className="absolute bottom-2 right-2 w-8 h-8 text-white" />}
              </button>
            ))}
          </div>
          {voted && !activePoll.isActive && <p className="mt-4 text-center font-bold">The poll has ended.</p>}
        </div>
      )}
    </div>
  );
};

export default LivePoll;