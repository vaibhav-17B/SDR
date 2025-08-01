
import Home from "./Home";

const Index = () => {
  const handleAuthChange = (authState: any) => {
    // This is handled at the App level, so we can pass a no-op function here
    // The actual auth state management happens in App.tsx
  };

  return <Home onAuthChange={handleAuthChange} />;
};

export default Index;
