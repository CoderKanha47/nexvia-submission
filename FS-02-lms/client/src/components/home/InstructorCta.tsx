import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';

function Pattern({ style }: { style?: CSSProperties }) {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={style}>
      <g fill="none" fillRule="evenodd">
        <g fill="#ffffff" fillOpacity="0.05">
          <path d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 36v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 6V0H4v4H0v2h4v4h2V6h4V4H6z" />
        </g>
      </g>
    </svg>
  );
}

export default function InstructorCta() {
  const benefits = [
    { icon: '💰', title: 'Earn Revenue', desc: 'Set your own price. Keep 80% of every sale after platform fees.' },
    { icon: '🌍', title: 'Global Reach', desc: 'Your courses visible to 10,000+ learners worldwide.' },
    { icon: '🛠️', title: 'Easy Creation', desc: 'Intuitive course builder with video upload, quizzes, and live class scheduling.' },
    { icon: '📊', title: 'Analytics Dashboard', desc: 'Track enrollments, revenue, student progress, and engagement metrics.' },
    { icon: '🎓', title: 'Live Classes', desc: 'Host live sessions with real-time chat, screen sharing, and recordings.' },
    { icon: '🏆', title: 'Verified Certificates', desc: 'Issue blockchain-verified certificates to your students.' },
  ];

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-indigo-50 via-white to-violet-50" aria-labelledby="instructor-heading">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium mb-6 animate-fade-up">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span>For Instructors</span>
          </div>
          <h2 id="instructor-heading" className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
            Teach What You Love,{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
              Earn from Your Expertise
            </span>
          </h2>
          <p className="text-lg text-gray-600 mb-10 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '200ms' }}>
            Join our community of expert instructors. Create courses, host live classes, and build a sustainable income doing what you do best.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {benefits.map((benefit, index) => (
            <article key={benefit.title} className="group p-6 bg-white rounded-2xl border border-gray-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">{benefit.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{benefit.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{benefit.desc}</p>
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-b-2xl" />
            </article>
          ))}
        </div>
        <div className="relative rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 p-8 lg:p-12 text-center text-white overflow-hidden">
          <div className="absolute inset-0 opacity-5" aria-hidden="true">
            <Pattern />
            <Pattern style={{ transform: 'translate(60px, 60px)' }} />
            <Pattern style={{ transform: 'translate(-60px, -60px)' }} />
            <Pattern style={{ transform: 'translate(60px, -60px)' }} />
            <Pattern style={{ transform: 'translate(-60px, 60px)' }} />
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Start Teaching?</h3>
            <p className="text-indigo-100 mb-8 max-w-xl mx-auto">Join 50+ instructors earning on LearnNEXT. No upfront costs, just share your knowledge.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/register"
                className="group px-8 py-4 rounded-xl text-lg font-semibold text-indigo-600 bg-white hover:bg-indigo-50 shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
              >
                Register as Instructor
              </Link>
              <Link
                to="/courses"
                className="px-8 py-4 rounded-xl text-lg font-semibold text-white bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30 transition-all duration-200"
              >
                See Instructor Courses
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}