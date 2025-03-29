
import { Heart } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t border-border mt-auto py-6">
      <div className="container flex flex-col md:flex-row justify-between items-center px-4">
        <div className="flex items-center space-x-1 text-sm text-muted-foreground">
          <span>© 2025 VoiceSphere</span>
          <span>•</span>
          <span>Privacy</span>
          <span>•</span>
          <span>Terms</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground mt-4 md:mt-0">
          <span>Made with</span>
          <Heart size={14} className="mx-1 text-destructive" />
          <span>by Khumanthem Lanthoiba Meitei</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
