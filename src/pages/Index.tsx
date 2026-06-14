import Navigation from "@/components/Navigation";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import DashboardPreview from "@/components/DashboardPreview";
import XAIExplanation from "@/components/XAIExplanation";
import HowItWorks from "@/components/HowItWorks";
import TeamSection from "@/components/TeamSection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navigation />
      <HeroSection />
      <FeaturesSection />
      <DashboardPreview />
      <XAIExplanation />
      <HowItWorks />
      <TeamSection />
      <Footer />
    </main>
  );
};

export default Index;
