import { HeroBanner } from "../../components/HeroBanner";

export const PickleballPage = (): JSX.Element => {
  return (
    <div className="bg-white flex flex-row justify-center w-full">
      <div className="bg-white w-full relative">
        <HeroBanner
          image="/pickleball-card.jpg"
          imageAlt="Pickleball coming soon"
          height="500px"
        >
          <div className="text-center text-white">
            <h1 className="text-5xl mb-4 font-heading">Pickleball</h1>
            <p className="text-3xl font-bold mb-4">
              Coming Soon
            </p>
            <p className="text-xl max-w-2xl mx-auto">
              We&apos;re working on bringing pickleball leagues to OFSL. Stay tuned for updates!
            </p>
          </div>
        </HeroBanner>
      </div>
    </div>
  );
};