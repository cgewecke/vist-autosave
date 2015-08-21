//serviceService.js

angular.module('vist.autosave')

.service('autoSaveService', ['$q', 'Playlists', 'Playlist', 'PlaylistItems', 'PlaylistItem',
   function($q, Playlists, Playlist, PlaylistItems, PlaylistItem ){

   var service = this;

   // ----------------------------- PUBLIC API ------------------------------------------------- 
   // service.queue.push({ fn: 'save_video', video: {...}, model: {...}, playlist: {...} })
   // service.queue.push({ fn: 'update_video_title', changes: {title: string, vist_title: string}, video: {...} )
   // service.queue.push({ fn: 'remove_video', video: {...} })
   // service.queue.push({ fn: 'add_playlist', playlist: {...}, model: {...} }) 
   // service.queue.push({ fn: 'update_playlist_title', playlist: {...}, title: string })
   
   // Variables
   this.finished = null; // Promise resolved when queue has emptied.
   this.queue = []; // Save queue

   // saveAll(): returns promise. Flushes save queue. If a save fails, the rejection will pass back the
   // enqueued object that didn't save and the flush will terminate. The remainder of the queue 
   // will be intact. 
   this.saveAll = function(){
      
      service.finished = $q.defer();
      flush();
      return service.finished.promise;
   } 

   // retry(obj): Re-queues a failed save and runs flush again
   this.retry = function(failedSave){

      service.queued.unshift(failedSave);
      service.finished = $q.defer();
      flush();
   }
   // ----------------------------- PRIVATE ---------------------------------------------------------------
   // flush() - Recursively dequeues and saves vist edits & additions. For record creation calls, the 'video' 
   // or 'playlist' param is just the data needed to create a DB record.  The 'model' is the version 
   // in the DOM and has to be updated with the DB id that returns from these creation calls. 

   function flush(){

      if (service.queue.length){

         var queued = service.queue.shift();

         switch(queued.fn){
            case 'save_video':
               PlaylistItems.create(queued.video, { playlistId: queued.playlist.id }, 
                  function( result ) { 
                     angular.extend(queued.model, result);
                     console.log(queued.fn  + ' : ' + queued.model.title);
                     flush(); 
                  },
                  function(failure){
                     service.finished.reject(queued);
                  }
               ); 
               break;
            case 'update_video_title':
               PlaylistItem.update( queued.changes, {id: queued.video.id}, 
                  function(result){
                     console.log(queued.fn  + ' : '  + queued.video.title);
                     flush();
                  }, 
                  function(failure){
                     service.finished.reject(queued);
                  }
               );
               break;
            case 'remove_video':
               new PlaylistItem({id: queued.video.id}).$remove(
                  function(success){
                     console.log(queued.fn  + ' : ' + queued.video.title);
                     flush();
                  },
                  function(failure){
                     service.finished.reject(queued);
                  }
               );
               break;
            case 'add_playlist':
               Playlists.save(queued.playlist,
                  function(result){ 
                    angular.extend(queued.model, result); 
                    console.log(queued.fn  + ' : ' + queued.model.title );
                    flush();   
                  },
                  function(failure){
                    service.finished.reject(queued);
                  }
               );
               break;
            case 'update_playlist_title':
               Playlist.update({ id: queued.playlist.id }, { title: queued.title, vist_title: S(queued.title).slugify().s},
                  function(success){
                    console.log(queued.fn  + ' : ' + queued.playlist.title );
                    flush(); 
                  },
                  function(failure){
                     service.finished.reject(queued);
                  }
               ); 
               break;
         }
      } else {
         console.log('Save queue empty');
         service.finished.resolve();
      }
      
   }
}])