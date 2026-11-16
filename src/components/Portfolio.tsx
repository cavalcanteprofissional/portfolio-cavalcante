import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Github } from 'lucide-react';
import projectsData from '../data/projects.json';
import { SectionHeader, Stagger, StaggerItem, STAGGER } from '../lib/motion';
import {
  TrendingUp,
  Bot,
  Eye,
  Brain,
  PieChart,
  HelpCircle,
  Map,
  Wrench,
  Video,
  Newspaper,
  TestTube,
  MessageCircleQuestion,
  ScanSearch,
  ShoppingCart,
  Link2,
  BookOpen,
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'chart-line': TrendingUp,
  robot: Bot,
  eye: Eye,
  brain: Brain,
  'pie-chart': PieChart,
  'help-circle': HelpCircle,
  newspaper: Newspaper,
  testtube: TestTube,
  map: Map,
  wrench: Wrench,
  video: Video,
  'message-circle-question': MessageCircleQuestion,
  'scan-search': ScanSearch,
  'shopping-cart': ShoppingCart,
  'link-2': Link2,
  'book-open': BookOpen,
};

interface ProjectCardProps {
  project: (typeof projectsData.projects)[0];
}

function ProjectCard({ project }: ProjectCardProps) {
  const { t } = useTranslation();
  const Icon = iconMap[project.icon] || TrendingUp;

  return (
    <StaggerItem>
      <motion.div
        className="group bg-card/80 backdrop-blur-sm rounded-soft-xl overflow-hidden border border-border/30 h-full flex flex-col shadow-soft hover:shadow-soft-lg transition-all"
        whileHover={{ y: -8 }}
        transition={{ duration: 0.3 }}
      >
<div className="relative h-44 bg-gradient-blue-light dark:bg-gradient-blue-dark flex items-center justify-center overflow-hidden">
          <motion.div
            className="w-18 h-18 rounded-soft-xl bg-white/90 dark:bg-white/10 shadow-lg flex items-center justify-center backdrop-blur-sm"
            whileHover={{ scale: 1.1, rotate: 5 }}
          >
             <Icon className="w-9 h-9 text-primary" aria-hidden="true" />
          </motion.div>
          <div className="absolute top-4 right-4">
            {project.status === "andamento" ? (
              <div className="px-3 py-1.5 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30 text-xs font-semibold flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-500 opacity-75" aria-hidden="true" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500" />
                </span>
                {t('portfolio.status.andamento')}
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-full bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/30 text-xs font-semibold flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75" aria-hidden="true" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                {t('portfolio.status.concluido')}
              </div>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6 flex-1 flex flex-col">
          <h3 className="text-lg sm:text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
            {t(project.titleKey)}
          </h3>
          <p className="text-muted-foreground text-sm mb-4 flex-1">
            {t(project.descriptionKey)}
          </p>

          <div className="flex flex-wrap gap-2 mb-6">
            {project.tech.map((tech) => (
              <motion.span
                key={tech}
                whileHover={{ scale: 1.05 }}
                className="px-3 py-1.5 rounded-full bg-secondary/50 text-secondary-foreground text-xs font-medium cursor-default"
              >
                {tech}
              </motion.span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <motion.a
              href={project.demoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-gradient-blue text-white text-sm font-medium hover:opacity-90 transition-opacity touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
              {t('buttons.demo')}
            </motion.a>
            <motion.a
              href={project.codeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border-2 border-border/50 bg-card/50 text-sm font-medium hover:border-primary/30 hover:shadow-soft transition-all touch-manipulation"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Github className="w-4 h-4" aria-hidden="true" />
              {t('buttons.code')}
            </motion.a>
          </div>
        </div>
      </motion.div>
    </StaggerItem>
  );
}

export function Portfolio() {
  const { t } = useTranslation();
  const { projects } = projectsData;

  return (
    <section id="projects" className="py-24">
      <div className="section-container">
        <SectionHeader
          title={t('sections.portfolio')}
          subtitle={t('portfolio.subtitle')}
          spacing="mb-16"
        />

        <Stagger stagger={STAGGER.card} amount={0} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </Stagger>
      </div>
    </section>
  );
}