import React from 'react';
// @ts-ignore
import { render, screen } from '@testing-library/react';
import ClassCard from './ClassCard';

describe('ClassCard', () => {
  it('renders class name and basic details', () => {
    const mockClass = {
      id: '1',
      subject: 'Math',
      grade: '10th',
      section: 'A',
      room: '101',
      startTime: '09:00',
      endTime: '10:00'
    };

    render(<ClassCard classData={mockClass} onClick={() => {}} />);
    
    expect(screen.getByText('Math')).toBeInTheDocument();
    expect(screen.getByText('Classroom')).toBeInTheDocument();
  });
});
