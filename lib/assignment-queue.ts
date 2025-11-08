// Global assignment queue to ensure only one assignment process runs at a time
// This prevents overwhelming the LLM API with parallel assignment requests

class AssignmentQueue {
  private processing = false;
  private pendingRequests: Array<() => Promise<number>> = [];
  
  async enqueue(assignFn: () => Promise<number>): Promise<number> {
    return new Promise((resolve, reject) => {
      this.pendingRequests.push(async () => {
        try {
          const result = await assignFn();
          resolve(result);
          return result;
        } catch (error) {
          reject(error);
          return 0;
        }
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue() {
    if (this.processing || this.pendingRequests.length === 0) return;
    
    this.processing = true;
    const nextRequest = this.pendingRequests.shift()!;
    
    try {
      await nextRequest();
    } finally {
      this.processing = false;
      this.processQueue(); // Process next
    }
  }
}

export const assignmentQueue = new AssignmentQueue();

