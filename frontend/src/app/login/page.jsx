"use client";
import React, { useState, useEffect } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { useAppData } from "@/context/AppContext";
import Loading from "@/components/Loading";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false); // ✅ state for button loading
  const router = useRouter();
  const { isAuth, loading: userLoading } = useAppData();

  useEffect(() => {
    if (isAuth) {
      router.push("/chat");
    }
  }, [isAuth, router]);

  if (userLoading) return <Loading />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await axios.post("http://localhost:5000/api/v1/login", {
        email,
      }); // ✅ fixed quotes

      alert(data.message);
      router.push(`/verify?email=${email}`); // ✅ fixed backticks
    } catch (error) {
      alert(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-r from-indigo-900 via-purple-900 to-black animate-gradient">
      <div className="relative max-w-md w-full">
        {/* Card container with 3D effect */}
        <div className="bg-gray-800/70 backdrop-blur-lg border border-gray-700 rounded-2xl p-8 shadow-2xl transform transition-transform duration-500 hover:scale-[1.02] hover:shadow-blue-500/30">
          <div className="text-center mb-8">
            <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/40 animate-bounce-slow">
              <Mail size={40} className="text-white drop-shadow-lg" />
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-3 drop-shadow-md">
              Welcome To ChatApp
            </h1>
            <p className="text-gray-300 text-lg tracking-wide">
              Enter your email to continue your journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-4 py-4 bg-gray-700/60 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold shadow-lg shadow-blue-500/40 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-2">
                <span>
                  {loading
                    ? "Sending Otp to your mail..."
                    : "Send Verification Code"}
                </span>
                {!loading && <ArrowRight className="w-5 h-5 animate-pulse" />}
              </div>
            </button>
          </form>
        </div>
      </div>

      <style jsx>{`
        .animate-gradient {
          background-size: 300% 300%;
          animation: gradientShift 10s ease infinite;
        }
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        .animate-bounce-slow {
          animation: bounce 3s infinite;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
