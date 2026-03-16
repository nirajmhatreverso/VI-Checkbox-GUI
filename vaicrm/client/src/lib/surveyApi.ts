// client/src/lib/surveyApi.ts
import { apiRequest } from "./queryClient";

export interface Survey {
    surveyId: number;
    surveyName: string;
    scrType: string;
    status: string;
    description: string;
    duration: number;
    action: string;
    parm: string;
    createDate: string;
    scrOriginator2user: number;
    responses?: number;
}

export interface SurveyResponse {
    status: string;
    statusCode: number;
    statusMessage: string;
    data: Survey[];
}

export const surveyApi = {
    /**
     * Fetch all surveys
     */
    getSurveys: async (): Promise<SurveyResponse> => {
        return apiRequest('/itsm/survey', 'GET');
    },

    /**
     * Register a new survey
     */
    registerSurvey: async (data: any): Promise<any> => {
        return apiRequest('/itsm/register/survey', 'POST', data);
    },
};

export default surveyApi;
