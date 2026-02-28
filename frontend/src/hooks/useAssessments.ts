/**
 * Assessment React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assessmentService, labTemplateService } from '../services/assessmentService';

// Query Keys
export const assessmentKeys = {
  all: ['assessments'] as const,
  lists: () => [...assessmentKeys.all, 'list'] as const,
  list: (filters: any) => [...assessmentKeys.lists(), filters] as const,
  details: () => [...assessmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...assessmentKeys.details(), id] as const,
  stats: (id: string) => [...assessmentKeys.all, 'stats', id] as const,
};

export const labTemplateKeys = {
  all: ['labTemplates'] as const,
  lists: () => [...labTemplateKeys.all, 'list'] as const,
  list: (filters: any) => [...labTemplateKeys.lists(), filters] as const,
  details: () => [...labTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...labTemplateKeys.details(), id] as const,
};

// Assessment Hooks
export function useAssessments(filters?: any) {
  return useQuery({
    queryKey: assessmentKeys.list(filters),
    queryFn: () => assessmentService.list(filters),
  });
}

export function useAssessment(id: string, include?: string[]) {
  return useQuery({
    queryKey: assessmentKeys.detail(id),
    queryFn: () => assessmentService.getById(id, include),
    enabled: !!id,
  });
}

export function useAssessmentStats(id: string) {
  return useQuery({
    queryKey: assessmentKeys.stats(id),
    queryFn: () => assessmentService.getStats(id),
    enabled: !!id,
  });
}

export function useCreateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assessmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
    },
  });
}

export function useUpdateAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      assessmentService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
    },
  });
}

export function useDeleteAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assessmentService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.lists() });
    },
  });
}

export function useAssignAssessment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      assessmentService.assign(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assessmentKeys.detail(variables.id) });
    },
  });
}

// Lab Template Hooks
export function useLabTemplates(filters?: any) {
  return useQuery({
    queryKey: labTemplateKeys.list(filters),
    queryFn: () => labTemplateService.list(filters),
  });
}

export function useLabTemplate(id: string) {
  return useQuery({
    queryKey: labTemplateKeys.detail(id),
    queryFn: () => labTemplateService.getById(id),
    enabled: !!id,
  });
}

export function useCreateLabTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: labTemplateService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labTemplateKeys.lists() });
    },
  });
}

export function useUpdateLabTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      labTemplateService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: labTemplateKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: labTemplateKeys.lists() });
    },
  });
}

export function useDeleteLabTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: labTemplateService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labTemplateKeys.lists() });
    },
  });
}

export function useSeedDefaultLabTemplates() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => labTemplateService.seedDefaults(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: labTemplateKeys.lists() });
    },
  });
}
