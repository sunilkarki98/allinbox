import Link from 'next/link';
import { InstagramIcon, TikTokIcon, WhatsAppIcon } from '@/components/icons/social-icons';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              U
            </div>
            <span className="text-xl font-bold">UnifiedInbox</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-gray-300 hover:text-white transition-colors font-medium">
              Login
            </Link>
            <Link href="/login" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-full font-medium transition-colors">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 mb-6">
            <span className="text-emerald-400 text-sm font-medium">🚀 AI-Powered Inbox</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            All Your DMs.
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              One Smart Inbox.
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop switching between apps. Manage Instagram, TikTok, and WhatsApp messages
            in one place. Let AI identify your hottest leads automatically.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40">
              Start Free Trial →
            </Link>
            <Link href="/login" className="w-full sm:w-auto border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white px-8 py-4 rounded-full font-medium transition-colors">
              I have an account
            </Link>
          </div>

          {/* Platform Icons */}
          <div className="flex items-center justify-center gap-8 mt-12 bg-gray-800/40 py-6 px-10 rounded-2xl border border-gray-700/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 text-gray-300">
              <InstagramIcon className="text-pink-500 w-6 h-6" />
              <span className="font-medium">Instagram</span>
            </div>
            <div className="w-px h-6 bg-gray-700" />
            <div className="flex items-center gap-3 text-gray-300">
              <TikTokIcon className="text-cyan-400 w-6 h-6" />
              <span className="font-medium">TikTok</span>
            </div>
            <div className="w-px h-6 bg-gray-700" />
            <div className="flex items-center gap-3 text-gray-300">
              <WhatsAppIcon className="text-green-500 w-6 h-6" />
              <span className="font-medium">WhatsApp</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Smart Features for Smart Sellers</h2>
            <p className="text-gray-400 text-lg">Everything you need to close more sales from social media</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-8 hover:border-emerald-500/30 transition-colors">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-2xl mb-6">
                📥
              </div>
              <h3 className="text-xl font-bold mb-3">Unified Inbox</h3>
              <p className="text-gray-400 leading-relaxed">
                All your Instagram DMs, TikTok comments, and WhatsApp messages in one beautiful dashboard. No more app switching.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-8 hover:border-emerald-500/30 transition-colors">
              <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center text-2xl mb-6">
                🧠
              </div>
              <h3 className="text-xl font-bold mb-3">AI Lead Scoring</h3>
              <p className="text-gray-400 leading-relaxed">
                Our AI automatically detects buying intent and ranks your customers. Focus on the leads that matter most.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-8 hover:border-emerald-500/30 transition-colors">
              <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-2xl mb-6">
                💡
              </div>
              <h3 className="text-xl font-bold mb-3">Smart Suggestions</h3>
              <p className="text-gray-400 leading-relaxed">
                Get AI-powered reply suggestions based on customer intent. Reply faster, convert more, work smarter.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-16">How It Works</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="relative">
              <div className="w-12 h-12 bg-emerald-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Connect Accounts</h3>
              <p className="text-gray-400">Link your Instagram, TikTok, and WhatsApp business accounts</p>
            </div>
            <div className="relative">
              <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Messages Flow In</h3>
              <p className="text-gray-400">All DMs and comments sync to your unified inbox automatically</p>
            </div>
            <div className="relative">
              <div className="w-12 h-12 bg-cyan-600 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Close More Sales</h3>
              <p className="text-gray-400">Use AI insights to prioritize and respond to hot leads first</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 rounded-3xl p-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Unify Your Inbox?</h2>
            <p className="text-gray-400 text-lg mb-8">
              Join thousands of online sellers who never miss a customer message.
            </p>
            <Link href="/login" className="inline-block bg-white text-gray-900 px-8 py-4 rounded-full font-semibold text-lg hover:bg-gray-100 transition-colors">
              Get Started Free →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              U
            </div>
            <span className="font-semibold">UnifiedInbox</span>
          </div>
          <p className="text-gray-500 text-sm">
            © 2026 UnifiedInbox. Built for online sellers.
          </p>
          <div className="flex items-center gap-6 text-gray-400 text-sm">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
