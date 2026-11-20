import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';

function Pattern({ style }: { style?: CSSProperties }) {
  return (
    <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={style}>
      <g fill="none" fillRule="evenodd">
        <g fill="#ffffff" fillOpacity="0.03">
          <path d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 36v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 6V0H4v4H0v2h4v4h2V6h4V4H6z" />
        </g>
      </g>
    </svg>
  );
}

export default function LiveHighlight() {
  return (
    <section className="py-16 lg:py-24 relative overflow-hidden" aria-labelledby="live-heading">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800" />
      <div className="absolute inset-0 opacity-3" aria-hidden="true">
        <Pattern />
        <Pattern style={{ transform: 'translate(60px, 60px)' }} />
        <Pattern style={{ transform: 'translate(-60px, -60px)' }} />
        <Pattern style={{ transform: 'translate(60px, -60px)' }} />
        <Pattern style={{ transform: 'translate(-60px, 60px)' }} />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/50 via-transparent to-transparent" aria-hidden="true" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-6 animate-fade-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>Live Classes Available Now</span>
            </div>
            <h2 id="live-heading" className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 animate-fade-up" style={{ animationDelay: '100ms' }}>
              Learn Live with{' '}
              <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Expert Instructors
              </span>
            </h2>
            <p className="text-lg text-indigo-100 mb-8 max-w-xl mx-auto lg:mx-0 animate-fade-up" style={{ animationDelay: '200ms' }}>
              Join interactive live sessions with real-time chat, screen sharing, and Q&A. Get instant feedback, collaborate with peers, and master concepts faster together.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 animate-fade-up" style={{ animationDelay: '300ms' }}>
              <Link
                to="/courses"
                className="group px-8 py-4 rounded-xl text-lg font-semibold text-indigo-700 bg-white hover:bg-indigo-50 shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-900"
              >
                Browse Live Classes
              </Link>
              <Link
                to="/register"
                className="group px-8 py-4 rounded-xl text-lg font-semibold text-white bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-indigo-900"
              >
                Become a Live Instructor
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-3 gap-6 animate-fade-up" style={{ animationDelay: '400ms' }}>
              <div className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm">
                <div className="text-3xl font-bold text-white mb-1">50+</div>
                <div className="text-indigo-200 text-sm">Live Sessions/Month</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm">
                <div className="text-3xl font-bold text-white mb-1">100%</div>
                <div className="text-indigo-200 text-sm">Interactive & Live</div>
              </div>
              <div className="text-center p-4 rounded-xl bg-white/10 backdrop-blur-sm">
                <div className="text-3xl font-bold text-white mb-1">24/7</div>
                <div className="text-indigo-200 text-sm">Recordings Available</div>
              </div>
            </div>
          </div>
          <div className="relative animate-fade-up" style={{ animationDelay: '200ms' }}>
            <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
              <div className="relative p-6 lg:p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white/10 rounded px-3 py-1.5 text-xs text-indigo-200 font-mono text-center">
                    live.learnnext.dev
                  </div>
                </div>
                <div className="bg-gray-900/50 rounded-xl p-6 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </div>
                      <span className="text-sm font-medium text-red-400">LIVE NOW</span>
                    </div>
                    <span className="text-xs text-indigo-300 font-mono">Advanced TypeScript Patterns</span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-yellow-400 mb-1">45</div>
                      <div className="text-xs text-indigo-300">Min Remaining</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-400 mb-1">23</div>
                      <div className="text-xs text-indigo-300">Participants</div>
                    </div>
                    <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400 mb-1">12</div>
                      <div className="text-xs text-indigo-300">Questions</div>
                    </div>
                  </div>
                  <div className="aspect-video bg-gray-900 rounded-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-transparent to-violet-600/30" />
                    <div className="relative z-10 flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-indigo-500/20 flex items-center justify-center">
                          <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <p className="text-white font-medium">Live Stream Preview</p>
                        <p className="text-indigo-300 text-sm mt-1">Instructor: Dr. Sarah Chen</p>
                      </div>
                    </div>
                    <div className="mt-6 flex items-center justify-center gap-4">
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        Join Live
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        Chat
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-12 text-center lg:mt-0">
          <Link
            to="/courses"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-lg font-semibold text-indigo-700 bg-white hover:bg-indigo-50 shadow-lg transition-all duration-200 hover:shadow-xl hover:-translate-y-0.5"
          >
            View Upcoming Live Classes
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </section>
  );
}