import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, ArrowLeft, Search, MapPin } from "lucide-react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import vaiLogo from "@/assets/vailogo.png";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 }
    }
  };

  const floatingAnimation = {
    y: [-10, 10, -10],
    transition: {
      duration: 3,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(27,87,164,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(230,124,26,0.1),transparent_50%)]"></div>
      </div>

      {/* Floating Elements */}
      <motion.div
        className="absolute top-20 left-20 w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-xl"
        animate={floatingAnimation}
      />
      <motion.div
        className="absolute bottom-20 right-20 w-32 h-32 bg-orange-100 dark:bg-orange-900/30 rounded-full blur-xl"
        animate={{
          ...floatingAnimation,
          transition: { ...floatingAnimation.transition, delay: 1 }
        }}
      />
      <motion.div
        className="absolute top-1/2 left-10 w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full blur-xl"
        animate={{
          ...floatingAnimation,
          transition: { ...floatingAnimation.transition, delay: 2 }
        }}
      />

      <motion.div
        className="relative z-10 w-full max-w-2xl mx-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
          <CardContent className="p-12 text-center">
            {/* Logo */}
            <motion.div variants={itemVariants} className="mb-8">
              <img
                src={vaiLogo}
                alt="VAI Logo"
                className="h-16 mx-auto mb-4"
              />
            </motion.div>

            {/* 404 Animation */}
            <motion.div variants={itemVariants} className="mb-8">
              <motion.h1
                className="text-8xl font-bold bg-gradient-to-r from-[#1b57a4] to-[#e67c1a] bg-clip-text text-transparent"
                animate={{
                  scale: [1, 1.05, 1],
                  transition: { duration: 2, repeat: Infinity }
                }}
              >
                404
              </motion.h1>
            </motion.div>

            {/* Main Message */}
            <motion.div variants={itemVariants} className="mb-8">
              <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                Oops! Page Not Found
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                The page you're looking for seems to have wandered off into the digital wilderness.
                Don't worry, we'll help you find your way back!
              </p>
            </motion.div>

            {/* Search Suggestion */}
            <motion.div variants={itemVariants} className="mb-8">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
                <MapPin className="h-4 w-4" />
                <span>Let's get you back on track</span>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-[#1b57a4] to-[#238fb7] hover:from-[#154a93] hover:to-[#1f7ba3] text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <Link href="/">
                  <Home className="mr-2 h-5 w-5" />
                  Back to Dashboard
                </Link>
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => window.history.back()}
                className="border-2 border-[#1b57a4] text-[#1b57a4] hover:bg-[#1b57a4] hover:text-white shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                Go Back
              </Button>
            </motion.div>

            {/* Help Links */}
            <motion.div variants={itemVariants} className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Need help? Try these popular sections:
              </p>
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <Link
                  href="/agents"
                  className="text-[#1b57a4] hover:text-[#e67c1a] transition-colors duration-200 hover:underline"
                >
                  Agent Management
                </Link>
                <Link
                  href="/customers"
                  className="text-[#1b57a4] hover:text-[#e67c1a] transition-colors duration-200 hover:underline"
                >
                  Customer Portal
                </Link>
                <Link
                  href="/inventory"
                  className="text-[#1b57a4] hover:text-[#e67c1a] transition-colors duration-200 hover:underline"
                >
                  Inventory
                </Link>
                <Link
                  href="/reports"
                  className="text-[#1b57a4] hover:text-[#e67c1a] transition-colors duration-200 hover:underline"
                >
                  Reports
                </Link>
              </div>
            </motion.div>
          </CardContent>
        </Card>

        {/* Footer */}
        <motion.div
          variants={itemVariants}
          className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400"
        >
          <p>© 2025 AZAM TV.</p>
        </motion.div>
      </motion.div>
    </div>
  );
}
