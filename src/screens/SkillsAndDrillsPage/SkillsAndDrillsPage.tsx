import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { HeroBanner } from "../../components/HeroBanner";
import { Link } from "react-router-dom";
import { User, MapPin, Calendar, DollarSign, Clock, Users, Star, Trophy, Target } from "lucide-react";

export const SkillsAndDrillsPage = (): JSX.Element => {
  // Session types data
  const sessionTypes = [
    {
      title: "Strategy/Gameplay Session",
      description: "Focus on applying skills in modified game situations",
      features: [
        "Transitions and positioning",
        "Team communication",
        "Game strategy implementation",
        "Modified game situations"
      ],
      requirement: "Minimum ball control skills required",
      icon: <Trophy className="w-8 h-8 text-[#B20000]" />
    },
    {
      title: "General Skill Sessions",
      description: "Comprehensive skill development for all levels",
      features: [
        "Fundamentals training",
        "Setter development", 
        "Reception techniques",
        "Attacking skills",
        "Defense and blocking"
      ],
      requirement: "Suitable for all skill levels",
      icon: <Target className="w-8 h-8 text-[#B20000]" />
    },
    {
      title: "Team Coaching",
      description: "Customized team training sessions",
      features: [
        "Saturdays 11:30am-1:30pm",
        "$300 per session",
        "Maximum 12 players",
        "Personalized team development"
      ],
      requirement: "Contact: ottawafunsports@gmail.com",
      icon: <Users className="w-8 h-8 text-[#B20000]" />
    }
  ];

  return (
    <div className="bg-white w-full">
      <HeroBanner
        image="/group-2-1.png"
        imageAlt="Skills and drills training"
        height="500px"
      >
        <div className="text-center text-white">
          <h1 className="text-5xl mb-4 font-heading">Skills & Drills</h1>
          <p className="text-xl max-w-3xl mx-auto mb-8">
            Elevate your volleyball skills with expert coaching from James Battiston, 
            former professional player and Canadian Beach National Team member.
          </p>
        </div>
      </HeroBanner>

      <div className="max-w-[1280px] mx-auto px-4">
        {/* Program Benefits */}
        <div className="pt-16 md:pt-24 pb-12 md:pb-16">
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center text-[#6F6F6F] mb-12">Why Choose Our Program?</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="bg-gray-50 p-8 rounded-lg">
                  <Star className="w-12 h-12 text-[#B20000] mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-[#6F6F6F] mb-3">Expert Coaching</h3>
                  <p className="text-[#6F6F6F]">Learn from a former Canadian National Team member</p>
                </div>
              </div>
              
              <div className="text-center">
                <div className="bg-gray-50 p-8 rounded-lg">
                  <Users className="w-12 h-12 text-[#B20000] mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-[#6F6F6F] mb-3">All Skill Levels</h3>
                  <p className="text-[#6F6F6F]">Programs designed for beginners to advanced players</p>
                </div>
              </div>
              
              <div className="text-center">
                <div className="bg-gray-50 p-8 rounded-lg">
                  <Target className="w-12 h-12 text-[#B20000] mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-[#6F6F6F] mb-3">Personalized Training</h3>
                  <p className="text-[#6F6F6F]">Individual skill development and feedback</p>
                </div>
              </div>
              
              <div className="text-center">
                <div className="bg-gray-50 p-8 rounded-lg">
                  <Trophy className="w-12 h-12 text-[#B20000] mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-[#6F6F6F] mb-3">Flexible Options</h3>
                  <p className="text-[#6F6F6F]">Choose individual sessions or team coaching</p>
                </div>
              </div>
            </div>
          </div>

          {/* Coach Introduction */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
            <div className="flex items-center justify-center">
              <img 
                src="/group-2-1.png" 
                alt="James Battiston coaching" 
                className="rounded-lg w-full max-w-[400px] h-[400px] object-cover shadow-lg"
              />
            </div>
            
            <div className="flex flex-col justify-center">
              <h3 className="text-2xl md:text-3xl font-bold text-[#6F6F6F] mb-6">Meet Your Coach</h3>
              <h4 className="text-xl font-bold text-[#B20000] mb-4">James Battiston</h4>
              <p className="text-[#6F6F6F]">Former professional volleyball player and member of the Canadian Beach National Team.  James has coached for several years with the Mavericks Volleyball Club as well as 15+ years at Madawaska Volleyball Camp.  He brings a wealth of knowledge, experience and expert guidance that players of all levels from beginner to competitive can benefit from.</p>
            </div>
          </div>
        </div>

        {/* Session Types */}
        <div className="pb-16 md:pb-24">
          <h2 className="text-3xl font-bold text-center text-[#6F6F6F] mb-12">Session Types</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sessionTypes.map((session, index) => (
              <Card key={index} className="h-full">
                <CardContent className="p-8">
                  <div className="flex items-center mb-6">
                    {session.icon}
                    <h3 className="text-xl font-bold text-[#6F6F6F] ml-4">{session.title}</h3>
                  </div>
                  
                  <p className="text-[#6F6F6F] mb-6">{session.description}</p>
                  
                  <ul className="space-y-3 text-[#6F6F6F] mb-6">
                    {session.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-[#6F6F6F] font-medium">{session.requirement}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Registration Information */}
        <div className="pb-16 md:pb-24">
          <Card className="bg-[#B20000] text-white">
            <CardContent className="p-8 md:p-12 text-center">
              <h2 className="text-3xl font-bold mb-6">Ready to Improve Your Game?</h2>
              <p className="text-xl mb-8 max-w-2xl mx-auto">
                Limited spots available - maximum 24 participants per session
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button className="bg-white hover:bg-gray-100 text-[#B20000] rounded-[10px] px-8 py-3">
                  Register Now
                </Button>
                <Button variant="outline" className="border-white text-white hover:bg-white hover:text-[#B20000] rounded-[10px] px-8 py-3">
                  Contact Us
                </Button>
              </div>
              
              <div className="text-center">
                <p className="text-lg mb-2">Questions? Contact us:</p>
                <a href="mailto:ottawafunsports@gmail.com" className="text-xl font-bold hover:underline">
                  ottawafunsports@gmail.com
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Diabetes Canada partnership section */}
      <div className="bg-white pt-8 pb-24">
        <div className="max-w-[1280px] mx-auto px-4">
          <div className="flex justify-center">
            <div className="flex flex-col md:flex-row items-center max-w-[800px] gap-6">
              <img
                className="w-[120px] md:w-[153px] h-auto md:h-[53px] object-contain"
                alt="Diabetes Canada logo"
                src="/diabetes-canada-logo-svg-1.png"
              />
              <div className="text-base md:text-lg text-center md:text-left">
                <span className="text-[#6f6f6f] leading-6 md:leading-7">
                  Proudly partnering with Diabetes Canada to promote healthier
                  lifestyles through sport and community wellness.
                </span>
                <a href="#" className="text-base md:text-lg text-[#b20000] underline ml-2 font-bold">
                  Learn more
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ready to Play CTA */}
      <div className="w-full py-12 md:py-16" style={{ background: 'linear-gradient(90deg, rgba(178,0,0,1) 0%, rgba(120,18,18,1) 100%)' }}>
        <div className="max-w-[1280px] mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to elevate your skills?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join our Skills & Drills program and train with the best.
          </p>
          <Button
            className="bg-white hover:bg-[#0d0d0d42] text-[#b20000] hover:text-white rounded-[10px] border border-white px-[15px] md:px-[25px] py-2.5"
          >
            <span className="text-base md:text-lg text-[#b20000] hover:text-white">
              Register now
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};