import React from 'react';
import {
  HardHat,
  Building2,
  Zap,
  Truck,
  Leaf,
  Shield,
  Sprout,
  Coins,
  Fish,
  Trees,
  Cpu,
  Scale,
  HeartPulse,
  GraduationCap,
  Briefcase,
  Compass,
  Flame,
  Car,
  MapPin
} from 'lucide-react';

export function getShortDeptName(deptName) {
  if (!deptName) return 'Unassigned';
  const cleaned = deptName.trim();
  
  const mappings = {
    'Department of Public Works': 'Public Works',
    'Department of Urban Development and Municipal Affairs': 'Urban Development',
    'Department of Information Technology and Electronics': 'IT & Electronics',
    'Department of Public Enterprises & Industrial Reconstruction': 'Public Enterprises',
    'Department of Technical Education, Training and Skill Development': 'Technical Edu & Skill Dev',
    'Department of Women and Child Development and Social Welfare': 'Women & Child Dev',
    'Department of Industry, Commerce & Enterprises': 'Industry & Commerce',
    'Department of Health & Family Welfare': 'Health & Family Welfare',
    'Department of Information & Cultural Affairs': 'Info & Cultural Affairs',
    'Department of Minority Affairs & Madrasah Education': 'Minority Affairs',
    'Department of Personnel & Administrative Reforms': 'Personnel & Admin',
    'Department of Home and Hill Affairs': 'Home & Hill Affairs',
    'Department of Land & Land Reforms': 'Land & Land Reforms',
    'Department of North Bengal Development': 'North Bengal Dev',
    'Department of School Education': 'School Education',
    'Department of Sundarban Affairs': 'Sundarban Affairs',
    'Department of Agriculture': 'Agriculture',
    'Department of Environment': 'Environment',
    'Department of Finance': 'Finance',
    'Department of Fisheries': 'Fisheries',
    'Department of Forests': 'Forests',
    'Department of Law': 'Law',
    'Department of Parliamentary Affairs': 'Parliamentary Affairs',
    'Department of Power': 'Power',
    'Department of Transport': 'Transport',
    'Department of Tourism': 'Tourism',
    'Department of Labour': 'Labour',
  };

  if (mappings[cleaned]) {
    return mappings[cleaned];
  }

  return cleaned.replace(/^(Department of|Dept of)\s+/i, '');
}

export function getDeptIcon(deptName) {
  const short = getShortDeptName(deptName).toLowerCase();
  
  if (short.includes('public works') || short.includes('works')) return <HardHat size={16} />;
  if (short.includes('urban') || short.includes('municipal')) return <Building2 size={16} />;
  if (short.includes('power') || short.includes('electricity')) return <Zap size={16} />;
  if (short.includes('transport')) return <Truck size={16} />;
  if (short.includes('environment')) return <Leaf size={16} />;
  if (short.includes('home') || short.includes('hill')) return <Shield size={16} />;
  if (short.includes('agriculture')) return <Sprout size={16} />;
  if (short.includes('finance')) return <Coins size={16} />;
  if (short.includes('fisheries') || short.includes('fish')) return <Fish size={16} />;
  if (short.includes('forest')) return <Trees size={16} />;
  if (short.includes('it &') || short.includes('technology') || short.includes('electronics')) return <Cpu size={16} />;
  if (short.includes('law') || short.includes('parliamentary')) return <Scale size={16} />;
  if (short.includes('health')) return <HeartPulse size={16} />;
  if (short.includes('education') || short.includes('school') || short.includes('skill')) return <GraduationCap size={16} />;
  if (short.includes('industry') || short.includes('enterprise') || short.includes('commerce')) return <Briefcase size={16} />;
  if (short.includes('tourism')) return <Compass size={16} />;
  if (short.includes('fire')) return <Flame size={16} />;
  if (short.includes('traffic')) return <Car size={16} />;
  if (short.includes('land')) return <MapPin size={16} />;
  
  return <Building2 size={16} />;
}

export function getDeptHealthGrade(resolvedRate, activeCount, criticalCount = 0) {
  const rate = parseFloat(resolvedRate) || 0;
  let score = rate;
  score -= (criticalCount * 12);
  if (activeCount > 5) {
    score -= ((activeCount - 5) * 3);
  }
  score = Math.max(0, Math.min(100, score));

  if (score >= 75) {
    return {
      grade: 'A+',
      label: 'Optimal',
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.15)',
      borderColor: 'rgba(16, 185, 129, 0.4)'
    };
  } else if (score >= 45) {
    return {
      grade: 'B',
      label: 'Moderate',
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.4)'
    };
  } else {
    return {
      grade: 'F',
      label: 'Bottleneck',
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.15)',
      borderColor: 'rgba(239, 68, 68, 0.4)'
    };
  }
}
