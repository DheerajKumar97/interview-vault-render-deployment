import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Footer from "@/components/Footer";
import Home from "./pages/Home";
import Applications from "./pages/Applications";
import ApplicationForm from "./pages/ApplicationForm";
import ApplicationDetail from "./pages/ApplicationDetail";
import ATSScoreChecker from "./pages/ATSScoreChecker";
import SkillAnalysis from "./pages/SkillAnalysis";
import InterviewPreparation from "./pages/InterviewPreparation";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import ForgotPassword from "./pages/auth/ForgotPassword";
import EmailConfirmation from "./pages/auth/EmailConfirmation";
import NotFound from "./pages/NotFound";
import Privacy from "./pages/legal/Privacy";
import TermsOfUse from "./pages/legal/TermsOfUse";
import CookiePreferences from "./pages/legal/CookiePreferences";
import DoNotSell from "./pages/legal/DoNotSell";
import AdChoices from "./pages/legal/AdChoices";
import AcrobatOnline from "./pages/legal/AcrobatOnline";
import AboutUs from "./pages/legal/AboutUs";
import UserAgreement from "./pages/legal/UserAgreement";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy";
import CookiePolicy from "./pages/legal/CookiePolicy";
import ChatBot from "./components/ChatBot";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth/login" element={<Login />} />
              <Route path="/auth/signup" element={<Signup />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/email-confirmation" element={<EmailConfirmation />} />
              <Route
                path="/applications"
                element={
                  <ProtectedRoute>
                    <Applications />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applications/new"
                element={
                  <ProtectedRoute>
                    <ApplicationForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/applications/:id"
                element={
                  <ProtectedRoute>
                    <ApplicationDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ats-score-checker"
                element={
                  <ProtectedRoute>
                    <ATSScoreChecker />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/skill-analysis"
                element={
                  <ProtectedRoute>
                    <SkillAnalysis />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview-preparation"
                element={
                  <ProtectedRoute>
                    <InterviewPreparation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              {/* Footer Legal Routes */}
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<TermsOfUse />} />
              <Route path="/cookie-preferences" element={<CookiePreferences />} />
              <Route path="/do-not-sell" element={<DoNotSell />} />
              <Route path="/ad-choices" element={<AdChoices />} />
              <Route path="/acrobat-online" element={<AcrobatOnline />} />
              <Route path="/About Us" element={<AboutUs />} />
              {/* New Legal Pages for Login */}
              <Route path="/legal/user-agreement" element={<UserAgreement />} />
              <Route path="/legal/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/legal/cookie-policy" element={<CookiePolicy />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ChatBot />
            <Footer />
          </AuthProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
