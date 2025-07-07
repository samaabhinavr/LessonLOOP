import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { TrendingUp, TrendingDown, Target, AlertCircle, ArrowLeft, BookOpen } from 'lucide-react';

interface TopicAnalysis {
  topic: string;
  average: number;
  quizzes: number;
}

interface AnalyticsData {
  strongest: TopicAnalysis[];
  weakest: TopicAnalysis[];
  almostMastered: TopicAnalysis[];
}

const AnalyticsCard = ({ title, topics, icon: Icon, color, message }) => {
  const getProgressBarColor = (average: number) => {
    if (average >= 80) return 'bg-green-500';
    if (average >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center mb-4">
        <Icon className={`w-6 h-6 mr-3 ${color}`} />
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      </div>
      <div className="space-y-4">
        {topics.length > 0 ? (
          topics.map((item) => (
            <div key={item.topic}>
              <div className="flex justify-between items-center mb-1">
                <p className="text-sm font-medium text-slate-700">{item.topic}</p>
                <p className={`text-sm font-bold ${color}`}>{item.average.toFixed(1)}%</p>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${getProgressBarColor(item.average)}`}
                  style={{ width: `${item.average}%` }}
                ></div>
              </div>
              <p className="text-xs text-slate-500 mt-1">{item.quizzes} quiz(zes)</p>
            </div>
          ))
        ) : (
          <div className="flex items-center text-sm text-slate-500">
            <AlertCircle className="w-4 h-4 mr-2" />
            <p>{message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Analytics = () => {
  const { classId } = useParams<{ classId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [className, setClassName] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const classRes = await axios.get(`http://localhost:5000/api/classes/${classId}`);
        setClassName(classRes.data.name);

        // Fetch analytics data
        const analyticsRes = await axios.get(`http://localhost:5000/api/analytics/${classId}`);
        
        if (analyticsRes.data) {
          setAnalytics(analyticsRes.data);
        } else {
          setAnalytics({ strongest: [], weakest: [], almostMastered: [] });
        }
        setError(null);
      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError("Failed to load analytics data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    if (classId) {
      fetchAnalytics();
    }
  }, [classId]);

  const pageTitle = useMemo(() => {
    return user?.role === 'Teacher' ? 'Class Performance Analytics' : 'My Performance Analytics';
  }, [user?.role]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading analytics...</div>;
  }

  if (error) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => navigate(`/class/${classId}`)}
              className="mr-4 p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-sky-500 rounded-full flex items-center justify-center mr-3">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{className}</h1>
                <p className="text-sm text-slate-500">{pageTitle}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <p className="text-slate-600 leading-relaxed">
            {user?.role === 'Teacher'
              ? "This page shows the collective performance of the entire class, highlighting the topics where students are excelling and where they might need more support. Use these insights to tailor your lesson plans and address common challenges."
              : "This page shows your personal performance across different topics. Use this analysis to understand your strengths, identify areas for improvement, and focus your studies more effectively."}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnalyticsCard
            title="Strongest Topics"
            topics={analytics?.strongest || []}
            icon={TrendingUp}
            color="text-green-500"
            message="No topics in this category yet. Keep working!"
          />
          <AnalyticsCard
            title="Needs Improvement"
            topics={analytics?.weakest || []}
            icon={TrendingDown}
            color="text-red-500"
            message="Great job! No topics need urgent improvement."
          />
          <AnalyticsCard
            title="Almost Mastered"
            topics={analytics?.almostMastered || []}
            icon={Target}
            color="text-amber-500"
            message="No topics are in this range at the moment."
          />
        </div>
      </main>
    </div>
  );
};

export default Analytics;