import {
  Hero,
  StatsStrip,
  FeaturedCourses,
  CategoryChips,
  HowItWorks,
  LiveHighlight,
  InstructorCta,
} from '../components/home';

export default function Home() {
  return (
    <>
      <Hero />
      <StatsStrip />
      <FeaturedCourses />
      <CategoryChips />
      <HowItWorks />
      <LiveHighlight />
      <InstructorCta />
    </>
  );
}