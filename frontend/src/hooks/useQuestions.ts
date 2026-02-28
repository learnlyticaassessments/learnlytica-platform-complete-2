/**
 * React Query Hooks for Questions
 * @module hooks/useQuestions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { questionService } from '../services/questionService';
import type {
  Question,
  CreateQuestionDTO,
  UpdateQuestionDTO,
  QuestionFilters
} from '../../../backend/shared/types/question.types';

// ============================================================================
// QUERY KEYS
// ============================================================================

export const questionKeys = {
  all: ['questions'] as const,
  lists: () => [...questionKeys.all, 'list'] as const,
  list: (filters?: QuestionFilters) => [...questionKeys.lists(), filters] as const,
  curricula: () => [...questionKeys.all, 'curricula'] as const,
  details: () => [...questionKeys.all, 'detail'] as const,
  detail: (id: string) => [...questionKeys.details(), id] as const,
  preview: (id: string) => [...questionKeys.all, 'preview', id] as const
};

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Fetch questions list with filters
 */
export function useQuestions(filters?: QuestionFilters) {
  return useQuery({
    queryKey: questionKeys.list(filters),
    queryFn: () => questionService.list(filters),
    staleTime: 30000 // 30 seconds
  });
}

/**
 * Fetch single question by ID
 */
export function useQuestion(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: questionKeys.detail(id),
    queryFn: () => questionService.getById(id),
    enabled: enabled && !!id
  });
}

/**
 * Fetch question preview (student view)
 */
export function useQuestionPreview(id: string, enabled: boolean = true) {
  return useQuery({
    queryKey: questionKeys.preview(id),
    queryFn: () => questionService.getPreview(id),
    enabled: enabled && !!id
  });
}

export function useQuestionCurricula(enabled: boolean = true) {
  return useQuery({
    queryKey: questionKeys.curricula(),
    queryFn: () => questionService.listCurricula(),
    enabled
  });
}

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create new question
 */
export function useCreateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateQuestionDTO) => questionService.create(data),
    onSuccess: () => {
      // Invalidate and refetch questions list
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
    }
  });
}

/**
 * Update question
 */
export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuestionDTO }) =>
      questionService.update(id, data),
    onSuccess: (updatedQuestion) => {
      // Update the question in cache
      queryClient.setQueryData(
        questionKeys.detail(updatedQuestion.id),
        updatedQuestion
      );
      // Invalidate lists to refetch
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
    }
  });
}

/**
 * Update question status
 */
export function useUpdateQuestionStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      questionService.updateStatus(id, status),
    onSuccess: (updatedQuestion) => {
      queryClient.setQueryData(
        questionKeys.detail(updatedQuestion.id),
        updatedQuestion
      );
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
    }
  });
}

/**
 * Delete question
 */
export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => questionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
    }
  });
}

/**
 * Clone question
 */
export function useCloneQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      questionService.clone(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
    }
  });
}

/**
 * Bulk import questions
 */
export function useBulkImportQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      questions,
      dryRun
    }: {
      questions: CreateQuestionDTO[];
      dryRun?: boolean;
    }) => questionService.bulkImport(questions, dryRun),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: questionKeys.lists() });
    }
  });
}
