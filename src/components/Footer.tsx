import { BookOpen, Github, Linkedin, Mail, Phone } from 'lucide-react';

const socialLinks = [
  { 
    name: 'LinkedIn', 
    url: 'https://linkedin.com/in/cavalcante-lucas', 
    icon: Linkedin 
  },
  { 
    name: 'GitHub', 
    url: 'https://github.com/cavalcanteprofissional', 
    icon: Github 
  },
  { 
    name: 'Lattes', 
    url: 'http://lattes.cnpq.br/7686247677030579', 
    icon: BookOpen 
  },
  { 
    name: 'Email', 
    url: 'mailto:cavalcanteprofissional@outlook.com', 
    icon: Mail 
  },
  { 
    name: 'WhatsApp', 
    url: 'https://wa.me/5585996859051', 
    icon: Phone 
  },
];

interface FooterProps {
  variant?: 'fixed' | 'static';
}

export function Footer({ variant = 'fixed' }: FooterProps) {
  return (
    <footer className={`${variant === 'fixed' ? 'fixed bottom-0 left-0 right-0' : 'static'} z-50 bg-background/90 backdrop-blur-xl border-t border-border/30 py-3`}>
      <div className="section-container">
        <div className="flex items-center justify-center gap-3">
          {socialLinks.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-full bg-secondary/30 hover:bg-gradient-blue hover:text-white transition-all group shadow-sm hover:shadow-soft"
                title={link.name}
              >
                <Icon className="w-5 h-5" />
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
}