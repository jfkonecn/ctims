import {CtmlStatusEnum} from "../../../../../../libs/types/src/ctml-status.enum";

export type status = (typeof CtmlStatusEnum)[keyof typeof CtmlStatusEnum];

// services the results page, with counts of latest matches
export type trialWithResults = {
  trialId: number
  nct_id: string
  nickname: string | null
  principal_investigator: string | null
  status: status | null
  createdAt: Date
  updatedAt: Date
  protocol_no: string
  trialRetCount?: number | null
  matchedDate?: Date | null
  trialStatus?: string | null
}

// the matchminer api returns the following format
export type trialWithResultsMiner = {
  protocol_no: string
  _updated: Date
  count: number
}
